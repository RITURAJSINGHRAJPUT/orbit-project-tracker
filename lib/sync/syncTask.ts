import type { Table, UpdateSpec } from 'dexie';
import type { z } from 'zod';
import { db, fromServer } from '@/lib/db/dexie';
import { supabase } from '@/lib/supabase/client';
import { isNewer } from './mapper';

/**
 * One synced table, as a set of pre-bound closures.
 *
 * Deliberately closures rather than a generic `SyncedTable<Local, Row>`
 * descriptor: TypeScript can't hold a heterogeneous list of differently-typed
 * descriptors without falling back to `any` at the registry boundary. Binding
 * each table's types inside `createSyncTask` keeps them fully checked, and the
 * registry only ever sees this narrow interface.
 */
export interface SyncTask {
  name: string;
  push(userId: string): Promise<number>;
  pull(userId: string): Promise<number>;
  countPending(): Promise<number>;
  markAllPending(): Promise<number>;
  /** Refresh the in-memory store after a pull actually changed something. */
  reload(): Promise<void>;
}

/** The minimum a local record must carry for the sync algorithm to work. */
interface SyncableRecord {
  id: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

const BATCH = 200;

/**
 * Watermark, keyed per user AND per table.
 *
 * It used to be per user only. With two tables that silently loses data:
 * pulling projects advances the shared watermark to "now", so the very next
 * pull of time entries asks for `updated_at > now` and skips every older
 * entry — permanently, because the watermark only moves forward.
 */
const watermarkKey = (userId: string, table: string) =>
  `orbit-sync-watermark:${userId}:${table}`;

/** Pre-existing installs stored the projects watermark without a table suffix. */
const LEGACY_KEY = (userId: string) => `orbit-sync-watermark:${userId}`;

const EPOCH = '1970-01-01T00:00:00.000Z';

function getWatermark(userId: string, table: string): string {
  const own = localStorage.getItem(watermarkKey(userId, table));
  if (own) return own;
  // Seed projects from the old un-suffixed key. Missing it would just cause one
  // full re-pull, which is harmless — bulkPut + fromServer is idempotent.
  if (table === 'projects') return localStorage.getItem(LEGACY_KEY(userId)) ?? EPOCH;
  return EPOCH;
}

const setWatermark = (userId: string, table: string, iso: string) =>
  localStorage.setItem(watermarkKey(userId, table), iso);

export function createSyncTask<Local extends SyncableRecord, Row extends { id: string; updated_at: string }>(config: {
  /** Postgres table name — also the watermark namespace. */
  name: string;
  table: Table<Local, string>;
  rowSchema: z.ZodType<Row>;
  toRow: (local: Local, userId: string) => Row;
  fromRow: (row: Row) => Local;
  reload: () => Promise<void>;
}): SyncTask {
  const { name, table, rowSchema, toRow, fromRow, reload } = config;

  return {
    name,
    reload,

    countPending: () => table.where('syncStatus').equals('pending').count(),

    /**
     * Upload every locally-modified row. Tombstones ride along as ordinary rows
     * carrying `deleted_at`, which is what makes a delete reach other devices.
     */
    async push(userId) {
      if (!supabase) return 0;

      const dirty = await table.where('syncStatus').equals('pending').toArray();
      if (dirty.length === 0) return 0;

      let pushed = 0;
      for (let i = 0; i < dirty.length; i += BATCH) {
        const chunk = dirty.slice(i, i + BATCH);
        const { error } = await supabase
          .from(name)
          .upsert(chunk.map((row) => toRow(row, userId)), { onConflict: 'id' });

        if (error) throw new Error(`push ${name} failed: ${error.message}`);

        // Mark clean per row, and only if it hasn't changed since the snapshot
        // was taken — an edit made during the upload must stay pending rather
        // than be overwritten by the stale copy we just sent. A write whose
        // only key is syncStatus is short-circuited by the Dexie hook, so this
        // can't re-dirty anything.
        await db.transaction('rw', table, async () => {
          for (const row of chunk) {
            const current = await table.get(row.id);
            if (current?.updatedAt === row.updatedAt) {
              await table.update(row.id, { syncStatus: 'synced' } as unknown as UpdateSpec<Local>);
            }
          }
        });
        pushed += chunk.length;
      }

      return pushed;
    },

    /** Download everything changed since this table's last successful sync. */
    async pull(userId) {
      if (!supabase) return 0;

      const since = getWatermark(userId, name);
      const { data, error } = await supabase
        .from(name)
        .select('*')
        .gt('updated_at', since)
        .order('updated_at', { ascending: true });

      if (error) throw new Error(`pull ${name} failed: ${error.message}`);
      if (!data?.length) return 0;

      const incoming: Local[] = [];
      let newest = since;

      for (const raw of data as unknown[]) {
        const parsed = rowSchema.safeParse(raw);
        if (!parsed.success) {
          // One malformed row must not poison the whole sync.
          console.warn(`sync: skipping unparseable ${name} row`, parsed.error.issues[0]?.message);
          continue;
        }
        const row = parsed.data;
        if (isNewer(row.updated_at, newest)) newest = row.updated_at;

        const local = await table.get(row.id);

        // Local edits still queued and newer than the server copy win — they go
        // up on the next push. Otherwise the server copy applies. This is
        // last-write-wins: with no base revision there's no way to detect a
        // genuine concurrent conflict, so 'conflict' stays unused rather than
        // pretending to be meaningful.
        if (local && local.syncStatus === 'pending' && isNewer(local.updatedAt, row.updated_at)) {
          continue;
        }

        incoming.push(fromRow(row));
      }

      if (incoming.length) {
        await table.bulkPut(fromServer(incoming));
      }

      // Advanced even when every row was skipped by the rule above — those rows
      // go up on the next push, so re-pulling them would achieve nothing.
      setWatermark(userId, name, newest);
      return incoming.length;
    },

    /**
     * First sign-in on a device that already has local rows: mark them all so
     * they upload. Ids are client-generated UUIDs, so the upsert is idempotent —
     * no duplicates, no id remapping.
     */
    async markAllPending() {
      const orphans = await table.where('syncStatus').notEqual('pending').toArray();
      if (orphans.length === 0) return 0;

      await db.transaction('rw', table, async () => {
        for (const row of orphans) {
          await table.update(row.id, { syncStatus: 'pending' } as unknown as UpdateSpec<Local>);
        }
      });
      return orphans.length;
    },
  };
}
