import { db } from '@/lib/db/dexie';
import { supabase } from '@/lib/supabase/client';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { useTimeEntryStore } from '@/lib/store/useTimeEntryStore';
import { fromRow, projectRowSchema, toRow } from './mapper';
import { entryFromRow, entryToRow, timeEntryRowSchema } from './timeEntryMapper';
import { createSyncTask, type SyncTask } from './syncTask';

/**
 * Local-first sync.
 *
 * IndexedDB is the source of truth. Supabase is a replica that survives an app
 * uninstall and lets a second device catch up. Every entry point below is a
 * no-op when offline or signed out — sync is additive and must never block the
 * UI, gate a render, or delay the splash.
 *
 * The per-table mechanics live in ./syncTask; this file is the registry and the
 * ordering guarantees.
 */

const projectsTask = createSyncTask({
  name: 'projects',
  table: db.projects,
  rowSchema: projectRowSchema,
  toRow,
  fromRow,
  reload: () => useProjectStore.getState().loadProjects(),
});

const timeEntriesTask = createSyncTask({
  name: 'time_entries',
  table: db.timeEntries,
  rowSchema: timeEntryRowSchema,
  toRow: entryToRow,
  fromRow: entryFromRow,
  reload: () => useTimeEntryStore.getState().loadEntries(),
});

const TASKS: SyncTask[] = [projectsTask, timeEntriesTask];

export interface SyncResult {
  pushed: number;
  pulled: number;
}

/**
 * Push everything, then pull everything.
 *
 * The ordering is global rather than per table on purpose. Pushing first means
 * this device's work is never clobbered by a pull that lands moments earlier,
 * and doing it per-table would weaken that once entities reference each other —
 * a time entry points at a project.
 *
 * A failure aborts the run and bubbles to the caller. That's intentional: the
 * rows stay marked pending, so the next trigger retries them and nothing is
 * lost.
 */
export async function syncNow(userId: string): Promise<SyncResult> {
  if (!supabase) return { pushed: 0, pulled: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { pushed: 0, pulled: 0 };

  let pushed = 0;
  for (const task of TASKS) pushed += await task.push(userId);

  let pulled = 0;
  for (const task of TASKS) {
    const n = await task.pull(userId);
    // Only reload the store whose table actually changed.
    if (n > 0) await task.reload();
    pulled += n;
  }

  return { pushed, pulled };
}

/** How many local rows are waiting to go up, across every table. */
export async function countPending(): Promise<number> {
  const counts = await Promise.all(TASKS.map((t) => t.countPending()));
  return counts.reduce((a, b) => a + b, 0);
}

/**
 * First sign-in on a device with existing local data — every table, or rows
 * created before signing in stay orphaned locally forever.
 */
export async function claimLocalRows(): Promise<number> {
  let claimed = 0;
  for (const task of TASKS) claimed += await task.markAllPending();
  return claimed;
}
