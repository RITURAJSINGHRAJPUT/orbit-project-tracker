import Dexie, { Table } from 'dexie';
import {
  Project,
  ProjectStatus,
  emptyBudget,
  emptyDocuments,
  emptyPhases,
  emptyTeam,
} from '@/lib/types';

const INDEXES =
  'id, status, priority, type, dueDate, createdAt, updatedAt, syncStatus, deletedAt';

/**
 * v1 statuses → their v2 equivalents. Kept as a named export so the mapping is
 * reviewable and easy to revise rather than buried in the upgrade closure.
 */
export const V1_STATUS_MIGRATION: Record<string, ProjectStatus> = {
  pending: 'planning',
  ongoing: 'in-progress',
  completed: 'completed',
  archived: 'archived',
};

export class OrbitDB extends Dexie {
  projects!: Table<Project, string>;

  constructor() {
    super('OrbitDB');

    this.version(1).stores({ projects: INDEXES });

    /**
     * v2 — the project-management expansion.
     *
     * Note this backfill only ever runs for databases that already exist at v1.
     * A fresh install jumps straight to v2 with an empty table, so every default
     * here must ALSO exist in the Zod schema and in `addProject` — the upgrade
     * is not a substitute for either.
     *
     * Backfilling is mandatory, not cosmetic: no field on `Project` is optional
     * and the UI reads e.g. `project.techStack.length` unguarded, so a row
     * missing a new array would throw on first render.
     */
    this.version(2)
      .stores({ projects: INDEXES })
      .upgrade((tx) =>
        tx
          .table<Project>('projects')
          .toCollection()
          .modify((p) => {
            const row = p as unknown as Record<string, unknown>;

            p.status = V1_STATUS_MIGRATION[p.status as string] ?? 'draft';

            row.pocName ??= '';
            row.pocPhone ??= '';
            row.shortDescription ??= '';
            row.requirements ??= '';
            row.deliverables ??= '';
            row.expectedEndDate ??= null;
            row.actualEndDate ??= null;
            row.clientCompany ??= '';
            row.clientGst ??= '';
            row.clientAddress ??= '';
            row.clientWebsite ??= '';
            row.clientNotes ??= '';
            row.internalNotes ??= '';
            row.meetingNotes ??= '';
            row.phases ??= emptyPhases();
            row.team ??= emptyTeam();
            row.documents ??= emptyDocuments();
            row.budget ??= emptyBudget();

            // Pre-existing rows could already be missing these.
            row.techStack ??= [];
            row.modules ??= [];
            row.tags ??= [];
            row.links ??= {};
            row.notes ??= '';

            // A migrated row must go up to the server: its status changed and it
            // gained fields. The hooks don't fire inside an upgrade transaction.
            p.syncStatus = 'pending';
          })
      );
  }
}

export const db = new OrbitDB();

/**
 * Marker tagging a write as server-originated, so the hooks below don't mark it
 * dirty — otherwise applying a pulled row would queue it straight back for
 * upload and push/pull would feed each other forever.
 *
 * This used to be an ambient module-level boolean held across `await`s. That
 * raced: a user deleting a project *while a sync was in flight* saw the flag
 * still set, so the delete was never marked pending and silently never
 * uploaded — the exact defect the hooks exist to prevent, since deleteProject
 * and restoreProject rely on them entirely. Tagging the rows themselves is
 * immune to timing.
 *
 * Stripped in the hooks; never persisted.
 */
const FROM_SERVER = '__fromServer';

/** Tags rows as server-originated. Use for every write that applies a pull. */
export function fromServer<T extends object>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row, [FROM_SERVER]: true })) as T[];
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
  const row = obj as unknown as Record<string, unknown>;
  if (row[FROM_SERVER]) {
    delete row[FROM_SERVER];
    return;
  }
  obj.syncStatus = 'pending';
  if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
});

db.projects.hook('updating', (mods) => {
  const changes = mods as Partial<Project> & Record<string, unknown>;

  // Server-originated: drop the marker, change nothing else.
  if (changes[FROM_SERVER]) return { [FROM_SERVER]: undefined };

  // A write that only flips syncStatus is bookkeeping, not a user edit.
  const keys = Object.keys(changes);
  if (keys.length === 1 && keys[0] === 'syncStatus') return;

  return {
    ...changes,
    updatedAt: changes.updatedAt ?? new Date().toISOString(),
    syncStatus: 'pending' as const,
  };
});
