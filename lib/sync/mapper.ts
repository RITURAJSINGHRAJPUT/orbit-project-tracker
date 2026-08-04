import { z } from 'zod';
import type { Project } from '@/lib/types';

/**
 * Translation layer between the local camelCase `Project` and the snake_case
 * Postgres row, plus the validation that anything off the wire (or out of a
 * backup file) has to pass before it touches IndexedDB.
 *
 * Note this is deliberately separate from `projectSchema` in
 * lib/validations/project.schema.ts, which validates FORM input and has no
 * id/createdAt/updatedAt/syncStatus/deletedAt. Zod strips unknown keys
 * silently, so running a full record through the form schema would "pass"
 * while quietly discarding every field it doesn't know about.
 */

const STATUS = ['pending', 'ongoing', 'completed', 'archived'] as const;
const PRIORITY = ['low', 'medium', 'high', 'critical'] as const;
const TYPE = [
  'website',
  'web-app',
  'mobile-app',
  'ai-automation',
  'api',
  'internal-tool',
  'other',
] as const;

const linksSchema = z
  .object({
    github: z.string().optional(),
    figma: z.string().optional(),
    production: z.string().optional(),
    staging: z.string().optional(),
    documentation: z.string().optional(),
    drive: z.string().optional(),
  })
  .default({});

/** A complete local record — used for imported backups and pulled rows. */
export const projectRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  client: z.string().default(''),
  description: z.string().default(''),
  status: z.enum(STATUS).default('pending'),
  priority: z.enum(PRIORITY).default('medium'),
  type: z.enum(TYPE).default('web-app'),
  progress: z.number().min(0).max(100).default(0),
  startDate: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  techStack: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
  links: linksSchema,
  notes: z.string().default(''),
  tags: z.array(z.string()).default([]),
  syncStatus: z.enum(['synced', 'pending', 'conflict']).default('pending'),
  deletedAt: z.string().nullable().default(null),
});

/** A row as it comes back from PostgREST. */
export const projectRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  client: z.string().nullable(),
  description: z.string().nullable(),
  status: z.enum(STATUS),
  priority: z.enum(PRIORITY),
  type: z.enum(TYPE),
  progress: z.number(),
  start_date: z.string().nullable(),
  due_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  tech_stack: z.array(z.string()).nullable(),
  modules: z.array(z.string()).nullable(),
  links: linksSchema.nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  deleted_at: z.string().nullable(),
});

export type ProjectRow = z.infer<typeof projectRowSchema>;

/**
 * Postgres `date` columns come back as 'YYYY-MM-DD', which is exactly what
 * <input type="date"> expects. But a value that was ever widened to a full
 * timestamp needs trimming back, or the date input silently renders empty.
 */
const toDateOnly = (value: string | null): string | null =>
  value ? value.slice(0, 10) : null;

/** Local record → server row. `syncStatus` is intentionally not sent. */
export function toRow(project: Project, userId: string): Omit<ProjectRow, 'links'> & {
  links: Project['links'];
} {
  return {
    id: project.id,
    user_id: userId,
    title: project.title,
    client: project.client ?? '',
    description: project.description ?? '',
    status: project.status,
    priority: project.priority,
    type: project.type,
    progress: project.progress ?? 0,
    start_date: toDateOnly(project.startDate),
    due_date: toDateOnly(project.dueDate),
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    tech_stack: project.techStack ?? [],
    modules: project.modules ?? [],
    tags: project.tags ?? [],
    links: project.links ?? {},
    notes: project.notes ?? '',
    deleted_at: project.deletedAt,
  };
}

/**
 * Server row → local record, marked 'synced' since by definition it just came
 * from the server. Nullable columns collapse to the non-null local defaults.
 */
export function fromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    client: row.client ?? '',
    description: row.description ?? '',
    status: row.status,
    priority: row.priority,
    type: row.type,
    progress: row.progress ?? 0,
    startDate: toDateOnly(row.start_date),
    dueDate: toDateOnly(row.due_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    techStack: row.tech_stack ?? [],
    modules: row.modules ?? [],
    links: row.links ?? {},
    notes: row.notes ?? '',
    tags: row.tags ?? [],
    syncStatus: 'synced',
    deletedAt: row.deleted_at,
  };
}

/**
 * Timestamps must be compared as instants, never as strings: `toISOString()`
 * produces '...Z' while PostgREST returns '...+00:00', so the same moment has
 * two different string forms and lexical comparison gives the wrong answer.
 */
export const isNewer = (a: string, b: string) => new Date(a).getTime() > new Date(b).getTime();
