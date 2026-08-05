import { z } from 'zod';
import {
  emptyBudget,
  emptyDocuments,
  emptyPhase,
  emptyPhases,
  emptyTeam,
} from '@/lib/types';

/**
 * Validation for the project FORM.
 *
 * Every field except `title` has a `.default(...)`, which is what lets
 * `projectSchema.parse({ title: '' })` produce a complete blank form. That
 * derived object is the form's single source of default values — there used to
 * be two hand-maintained lists, and the drift between them shipped a bug where
 * "+ New" opened pre-filled with the last edited project.
 *
 * Record-level fields (`id`, `createdAt`, `updatedAt`, `syncStatus`,
 * `deletedAt`) are deliberately absent — they're never user-editable. See
 * lib/sync/mapper.ts for the schemas that cover the full record and the wire row.
 */

export const STATUS_VALUES = [
  'draft',
  'requirement-gathering',
  'planning',
  'in-progress',
  'on-hold',
  'testing',
  'completed',
  'cancelled',
  'archived',
] as const;

export const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'] as const;

export const TYPE_VALUES = [
  'website',
  'web-app',
  'mobile-app',
  'pwa',
  'ai-automation',
  'api',
  'design',
  'internal-tool',
  'other',
] as const;

export const PHASE_STATUS_VALUES = ['not-started', 'in-progress', 'completed', 'blocked'] as const;

export const projectLinksSchema = z.object({
  github: z.string().default(''),
  figma: z.string().default(''),
  production: z.string().default(''),
  staging: z.string().default(''),
  documentation: z.string().default(''),
  drive: z.string().default(''),
});

const phaseSchema = z.object({
  status: z.enum(PHASE_STATUS_VALUES).default('not-started'),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  progress: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).default(''),
});

export const projectPhasesSchema = z.object({
  discovery: phaseSchema.default(emptyPhase),
  design: phaseSchema.default(emptyPhase),
  development: phaseSchema.default(emptyPhase),
  testing: phaseSchema.default(emptyPhase),
});

export const projectTeamSchema = z.object({
  projectManager: z.string().max(100).default(''),
  teamLead: z.string().max(100).default(''),
  qa: z.string().max(100).default(''),
  developers: z.array(z.string()).default([]),
  designers: z.array(z.string()).default([]),
});

const documentSchema = z.object({
  url: z.string().default(''),
  fileName: z.string().optional(),
});

const emptyDocument = () => ({ url: '' });

export const projectDocumentsSchema = z.object({
  proposal: documentSchema.default(emptyDocument),
  nda: documentSchema.default(emptyDocument),
  brd: documentSchema.default(emptyDocument),
  design: documentSchema.default(emptyDocument),
  contract: documentSchema.default(emptyDocument),
  invoice: documentSchema.default(emptyDocument),
  other: documentSchema.default(emptyDocument),
});

export const projectBudgetSchema = z.object({
  estimated: z.number().nullable().default(null),
  final: z.number().nullable().default(null),
  received: z.number().nullable().default(null),
});

/**
 * Every field with its default. `title` is defaulted here so the blank form can
 * be parsed out of this shape; `projectSchema` below re-declares it with the
 * `.min(1)` rule the form actually validates against. One field list, two views.
 */
/**
 * Only what the form actually edits.
 *
 * The `Project` record is much larger — team, budget, documents, links, phases,
 * client details and the extra notes all still exist, still sync, and still
 * render in the detail sheet. They simply have no editor right now. Keeping
 * them on the model rather than deleting them means existing data survives and
 * re-adding an editor later is a component, not a migration.
 */
const projectFields = {
  title: z.string().max(100, 'Too long').default(''),
  client: z.string().max(100, 'Too long').default(''),
  description: z.string().max(2000, 'Too long').default(''),

  status: z.enum(STATUS_VALUES).default('draft'),
  priority: z.enum(PRIORITY_VALUES).default('medium'),
  type: z.enum(TYPE_VALUES).default('web-app'),
  progress: z.number().min(0).max(100).default(0),

  pocName: z.string().max(100).default(''),
  pocPhone: z.string().max(30).default(''),

  startDate: z.string().nullable().default(null),
  expectedEndDate: z.string().nullable().default(null),
};

/** What the form validates against — title is required here. */
export const projectSchema = z.object({
  ...projectFields,
  title: z.string().min(1, 'Project name is required').max(100, 'Too long'),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

/** Same field list, all defaulted — used to build the blank form. */
const blankSchema = z.object(projectFields);

/**
 * The blank form, derived from the schema so the two can never drift apart.
 * This replaced a hand-maintained duplicate list, which is what let "+ New"
 * ship pre-filled with the previously edited project.
 */
export const emptyProjectForm = (): ProjectFormData => blankSchema.parse({});
