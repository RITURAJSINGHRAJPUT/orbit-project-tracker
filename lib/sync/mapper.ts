import { z } from 'zod';
import type { Project } from '@/lib/types';
import {
  emptyBudget,
  emptyDocuments,
  emptyPhases,
  emptyTeam,
} from '@/lib/types';
import {
  PRIORITY_VALUES,
  STATUS_VALUES,
  TYPE_VALUES,
  projectBudgetSchema,
  projectDocumentsSchema,
  projectLinksSchema,
  projectPhasesSchema,
  projectTeamSchema,
} from '@/lib/validations/project.schema';

/**
 * Translation between the local camelCase `Project` and the snake_case Postgres
 * row, plus the validation anything off the wire (or out of a backup file) must
 * pass before it reaches IndexedDB.
 *
 * The enum value lists and the nested sub-schemas are imported from the form
 * schema rather than redeclared — three copies of "what statuses exist" is
 * exactly how they drift.
 *
 * Zod strips unknown keys silently, so a field missing from the schemas below
 * is dropped without an error: on every backup import, and on every pull. The
 * `toRow`/`fromRow` literals are explicit for the same reason — a missing key
 * there is at least a type error.
 */

const emptyLinks = () => ({
  github: '',
  figma: '',
  production: '',
  staging: '',
  documentation: '',
  drive: '',
});

/**
 * v1 → v2 value renames, applied before validation.
 *
 * Without this an exported backup from before the expansion fails
 * `projectRecordSchema` outright — 'pending' and 'ongoing' are no longer valid
 * statuses — and every row is silently skipped on import. Mirrors
 * V1_STATUS_MIGRATION in lib/db/dexie.ts.
 */
const LEGACY_STATUS: Record<string, string> = {
  pending: 'planning',
  ongoing: 'in-progress',
};

/** Normalises a raw record from an older export so it can be validated. */
export function migrateLegacyProject(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const row = { ...(raw as Record<string, unknown>) };
  if (typeof row.status === 'string' && LEGACY_STATUS[row.status]) {
    row.status = LEGACY_STATUS[row.status];
  }
  return row;
}

/** A complete local record — used for imported backups and pulled rows. */
export const projectRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  client: z.string().default(''),
  description: z.string().default(''),

  status: z.enum(STATUS_VALUES).default('draft'),
  priority: z.enum(PRIORITY_VALUES).default('medium'),
  type: z.enum(TYPE_VALUES).default('web-app'),
  progress: z.number().min(0).max(100).default(0),

  pocName: z.string().default(''),
  pocPhone: z.string().default(''),

  shortDescription: z.string().default(''),
  requirements: z.string().default(''),
  deliverables: z.string().default(''),

  startDate: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  expectedEndDate: z.string().nullable().default(null),
  actualEndDate: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),

  clientCompany: z.string().default(''),
  clientGst: z.string().default(''),
  clientAddress: z.string().default(''),
  clientWebsite: z.string().default(''),
  clientNotes: z.string().default(''),

  techStack: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
  phases: projectPhasesSchema.default(emptyPhases),
  team: projectTeamSchema.default(emptyTeam),
  documents: projectDocumentsSchema.default(emptyDocuments),
  budget: projectBudgetSchema.default(emptyBudget),
  links: projectLinksSchema.default(emptyLinks),

  notes: z.string().default(''),
  internalNotes: z.string().default(''),
  meetingNotes: z.string().default(''),
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

  status: z.enum(STATUS_VALUES),
  priority: z.enum(PRIORITY_VALUES),
  type: z.enum(TYPE_VALUES),
  progress: z.number(),

  poc_name: z.string().nullable(),
  poc_phone: z.string().nullable(),

  short_description: z.string().nullable(),
  requirements: z.string().nullable(),
  deliverables: z.string().nullable(),

  start_date: z.string().nullable(),
  due_date: z.string().nullable(),
  expected_end_date: z.string().nullable(),
  actual_end_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),

  client_company: z.string().nullable(),
  client_gst: z.string().nullable(),
  client_address: z.string().nullable(),
  client_website: z.string().nullable(),
  client_notes: z.string().nullable(),

  tech_stack: z.array(z.string()).nullable(),
  modules: z.array(z.string()).nullable(),
  tags: z.array(z.string()).nullable(),
  phases: projectPhasesSchema.nullable(),
  team: projectTeamSchema.nullable(),
  documents: projectDocumentsSchema.nullable(),
  budget: projectBudgetSchema.nullable(),
  links: projectLinksSchema.nullable(),

  notes: z.string().nullable(),
  internal_notes: z.string().nullable(),
  meeting_notes: z.string().nullable(),

  deleted_at: z.string().nullable(),
});

export type ProjectRow = z.infer<typeof projectRowSchema>;

/**
 * Postgres `date` columns come back as 'YYYY-MM-DD', which is what
 * <input type="date"> expects. A value ever widened to a full timestamp needs
 * trimming, or the date input silently renders empty.
 */
const toDateOnly = (value: string | null): string | null => (value ? value.slice(0, 10) : null);

/** Local record → server row. `syncStatus` is deliberately not sent. */
export function toRow(project: Project, userId: string): ProjectRow {
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

    poc_name: project.pocName ?? '',
    poc_phone: project.pocPhone ?? '',

    short_description: project.shortDescription ?? '',
    requirements: project.requirements ?? '',
    deliverables: project.deliverables ?? '',

    start_date: toDateOnly(project.startDate),
    due_date: toDateOnly(project.dueDate),
    expected_end_date: toDateOnly(project.expectedEndDate),
    actual_end_date: toDateOnly(project.actualEndDate),
    created_at: project.createdAt,
    updated_at: project.updatedAt,

    client_company: project.clientCompany ?? '',
    client_gst: project.clientGst ?? '',
    client_address: project.clientAddress ?? '',
    client_website: project.clientWebsite ?? '',
    client_notes: project.clientNotes ?? '',

    tech_stack: project.techStack ?? [],
    modules: project.modules ?? [],
    tags: project.tags ?? [],
    phases: project.phases ?? emptyPhases(),
    team: project.team ?? emptyTeam(),
    documents: project.documents ?? emptyDocuments(),
    budget: project.budget ?? emptyBudget(),
    links: { ...emptyLinks(), ...(project.links ?? {}) },

    notes: project.notes ?? '',
    internal_notes: project.internalNotes ?? '',
    meeting_notes: project.meetingNotes ?? '',

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

    pocName: row.poc_name ?? '',
    pocPhone: row.poc_phone ?? '',

    shortDescription: row.short_description ?? '',
    requirements: row.requirements ?? '',
    deliverables: row.deliverables ?? '',

    startDate: toDateOnly(row.start_date),
    dueDate: toDateOnly(row.due_date),
    expectedEndDate: toDateOnly(row.expected_end_date),
    actualEndDate: toDateOnly(row.actual_end_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    clientCompany: row.client_company ?? '',
    clientGst: row.client_gst ?? '',
    clientAddress: row.client_address ?? '',
    clientWebsite: row.client_website ?? '',
    clientNotes: row.client_notes ?? '',

    techStack: row.tech_stack ?? [],
    modules: row.modules ?? [],
    tags: row.tags ?? [],
    phases: row.phases ?? emptyPhases(),
    team: row.team ?? emptyTeam(),
    documents: row.documents ?? emptyDocuments(),
    budget: row.budget ?? emptyBudget(),
    links: row.links ?? emptyLinks(),

    notes: row.notes ?? '',
    internalNotes: row.internal_notes ?? '',
    meetingNotes: row.meeting_notes ?? '',

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
