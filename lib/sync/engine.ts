import { db, withoutDirtyTracking } from '@/lib/db/dexie';
import { supabase } from '@/lib/supabase/client';
import { useProjectStore } from '@/lib/store/useProjectStore';
import type { Project } from '@/lib/types';
import { fromRow, isNewer, projectRowSchema, toRow, type ProjectRow } from './mapper';

/**
 * Local-first sync.
 *
 * IndexedDB is the source of truth. Supabase is a replica that survives an app
 * uninstall and lets a second device catch up. Every entry point below is a
 * no-op when offline or signed out — sync is additive and must never block the
 * UI, gate a render, or delay the splash.
 */

const BATCH = 200;

const watermarkKey = (userId: string) => `orbit-sync-watermark:${userId}`;

/** Keyed per user so switching accounts can't inherit the previous watermark. */
const getWatermark = (userId: string) =>
  localStorage.getItem(watermarkKey(userId)) ?? '1970-01-01T00:00:00.000Z';

const setWatermark = (userId: string, iso: string) =>
  localStorage.setItem(watermarkKey(userId), iso);

export interface SyncResult {
  pushed: number;
  pulled: number;
}

/**
 * Upload every locally-modified row.
 *
 * Tombstones ride along as ordinary rows carrying `deleted_at`, which is what
 * makes a delete on this device reach the others.
 */
async function push(userId: string): Promise<number> {
  if (!supabase) return 0;

  const dirty = await db.projects.where('syncStatus').equals('pending').toArray();
  if (dirty.length === 0) return 0;

  let pushed = 0;
  for (let i = 0; i < dirty.length; i += BATCH) {
    const chunk = dirty.slice(i, i + BATCH);
    const { error } = await supabase
      .from('projects')
      .upsert(chunk.map((p) => toRow(p, userId)), { onConflict: 'id' });

    if (error) throw new Error(`push failed: ${error.message}`);

    // Marking them clean must not re-mark them dirty.
    await withoutDirtyTracking(async () => {
      await db.projects.bulkPut(chunk.map((p) => ({ ...p, syncStatus: 'synced' as const })));
    });
    pushed += chunk.length;
  }

  return pushed;
}

/** Download everything changed since the last successful sync. */
async function pull(userId: string): Promise<number> {
  if (!supabase) return 0;

  const since = getWatermark(userId);
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });

  if (error) throw new Error(`pull failed: ${error.message}`);
  if (!data?.length) return 0;

  const incoming: Project[] = [];
  let newest = since;

  for (const raw of data as unknown[]) {
    const parsed = projectRowSchema.safeParse(raw);
    if (!parsed.success) {
      // One malformed row must not poison the whole sync.
      console.warn('sync: skipping unparseable row', parsed.error.issues[0]?.message);
      continue;
    }
    const row: ProjectRow = parsed.data;
    if (isNewer(row.updated_at, newest)) newest = row.updated_at;

    const local = await db.projects.get(row.id);

    // Local edits that are still queued and newer than the server copy win —
    // they'll go up on the next push. Otherwise the server copy applies.
    // This is last-write-wins: with no base revision there's no way to detect a
    // genuine concurrent conflict, so `syncStatus: 'conflict'` stays unused
    // rather than pretending to be meaningful.
    if (local && local.syncStatus === 'pending' && isNewer(local.updatedAt, row.updated_at)) {
      continue;
    }

    incoming.push(fromRow(row));
  }

  if (incoming.length) {
    await withoutDirtyTracking(async () => {
      await db.projects.bulkPut(incoming);
    });
  }

  setWatermark(userId, newest);
  return incoming.length;
}

/**
 * Push then pull, then refresh the in-memory store.
 *
 * Push first so this device's work is never clobbered by a pull that arrives
 * moments earlier.
 */
export async function syncNow(userId: string): Promise<SyncResult> {
  if (!supabase) return { pushed: 0, pulled: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { pushed: 0, pulled: 0 };

  const pushed = await push(userId);
  const pulled = await pull(userId);

  if (pulled > 0) await useProjectStore.getState().loadProjects();

  return { pushed, pulled };
}

/** How many local rows are waiting to go up. */
export const countPending = () => db.projects.where('syncStatus').equals('pending').count();

/**
 * First sign-in on a device that already has local projects: they simply
 * upload. `user_id` is stamped at map time, and because ids are client
 * generated UUIDs the upsert is idempotent — no duplicates, no id remapping.
 */
export async function claimLocalRows(): Promise<number> {
  const orphans = await db.projects.where('syncStatus').notEqual('pending').toArray();
  if (orphans.length === 0) return 0;

  await withoutDirtyTracking(async () => {
    await db.projects.bulkPut(orphans.map((p) => ({ ...p, syncStatus: 'pending' as const })));
  });
  return orphans.length;
}
