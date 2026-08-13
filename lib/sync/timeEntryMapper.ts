import { z } from 'zod';
import type { TimeEntry } from '@/lib/types';
import { ENTRY_STATUS_VALUES, WORK_TYPE_VALUES } from '@/lib/validations/time-entry.schema';

/**
 * TimeEntry ↔ Postgres row.
 *
 * Same contract as the project mapper: `syncStatus` is device-local and never
 * sent, and every key is written explicitly so a missing one is a type error
 * rather than a field zod silently strips.
 */

/** A complete local record — for imported backups and pulled rows. */
export const timeEntryRecordSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  projectId: z.string().nullable().default(null),
  workType: z.enum(WORK_TYPE_VALUES).default('development'),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
  minutes: z.number().default(0),
  reason: z.string().default(''),
  status: z.enum(ENTRY_STATUS_VALUES).default('pending'),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncStatus: z.enum(['synced', 'pending', 'conflict']).default('pending'),
  deletedAt: z.string().nullable().default(null),
});

/** A row as it comes back from PostgREST. */
export const timeEntryRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  entry_date: z.string(),
  project_id: z.string().nullable(),
  work_type: z.enum(WORK_TYPE_VALUES),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  minutes: z.number(),
  reason: z.string().nullable(),
  status: z.enum(ENTRY_STATUS_VALUES),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export type TimeEntryRow = z.infer<typeof timeEntryRowSchema>;

/**
 * Postgres `time` returns 'HH:MM:SS' while <input type="time"> wants 'HH:MM'.
 * Mirrors toDateOnly in ./mapper — without it the time input renders empty.
 */
const toTimeOnly = (value: string | null): string | null =>
  value ? value.slice(0, 5) : null;

const toDateOnly = (value: string | null): string | null => (value ? value.slice(0, 10) : null);

export function entryToRow(entry: TimeEntry, userId: string): TimeEntryRow {
  return {
    id: entry.id,
    user_id: userId,
    entry_date: entry.date,
    project_id: entry.projectId,
    work_type: entry.workType,
    start_time: entry.startTime,
    end_time: entry.endTime,
    minutes: entry.minutes ?? 0,
    reason: entry.reason ?? '',
    status: entry.status,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    deleted_at: entry.deletedAt,
  };
}

export function entryFromRow(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    date: toDateOnly(row.entry_date) ?? '',
    projectId: row.project_id,
    workType: row.work_type,
    startTime: toTimeOnly(row.start_time),
    endTime: toTimeOnly(row.end_time),
    minutes: row.minutes ?? 0,
    reason: row.reason ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    deletedAt: row.deleted_at,
  };
}
