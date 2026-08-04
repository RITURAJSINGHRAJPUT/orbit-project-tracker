import Dexie, { Table } from 'dexie';
import { Project } from '@/lib/types';

export class OrbitDB extends Dexie {
  projects!: Table<Project, string>;

  constructor() {
    super('OrbitDB');

    this.version(1).stores({
      projects: 'id, status, priority, type, dueDate, createdAt, updatedAt, syncStatus, deletedAt',
    });
  }
}

export const db = new OrbitDB();

/**
 * When true, writes are NOT marked dirty. The sync engine sets this around its
 * own pull-writes — without it, applying a row from the server would mark it
 * pending, which would push it straight back, which would pull it again. Push
 * and pull would feed each other forever.
 */
let suppressDirtyTracking = false;

/** Runs `fn` without marking anything it writes as needing sync. */
export async function withoutDirtyTracking<T>(fn: () => Promise<T>): Promise<T> {
  suppressDirtyTracking = true;
  try {
    return await fn();
  } finally {
    suppressDirtyTracking = false;
  }
}

/**
 * Dirty tracking lives here rather than in the store because there are nine
 * separate write paths — six store actions plus `db.projects.bulkPut()` and
 * `db.projects.clear()` in the settings page, which bypass the store entirely.
 * A hook catches all of them in one place.
 *
 * It also fixes two defects the store had: `deleteProject` and `restoreProject`
 * wrote only `deletedAt` and never set `syncStatus`, so a `syncStatus`-based
 * outbox missed every delete and every restore — deletions never reached the
 * server and would resurrect on the next pull.
 */
db.projects.hook('creating', (_pk, obj) => {
  if (suppressDirtyTracking) return;
  obj.syncStatus = 'pending';
  if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
});

db.projects.hook('updating', (mods) => {
  if (suppressDirtyTracking) return;

  const changes = mods as Partial<Project>;
  // A write that only flips syncStatus is bookkeeping, not a user edit.
  const keys = Object.keys(changes);
  if (keys.length === 1 && keys[0] === 'syncStatus') return;

  return {
    ...changes,
    updatedAt: changes.updatedAt ?? new Date().toISOString(),
    syncStatus: 'pending' as const,
  };
});
