import { z } from 'zod';

/**
 * Validation for the Extra Working Hours form.
 *
 * The enum value lists are exported and imported by the mapper rather than
 * redeclared — the project schemas learned that lesson: three copies of "what
 * statuses exist" is exactly how they drift. The Postgres `check` constraints
 * in supabase/migrations/003_time_entries.sql must be kept in step by hand.
 */

export const WORK_TYPE_VALUES = [
  'development',
  'meeting',
  'support',
  'deployment',
  'other',
] as const;

export const ENTRY_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;

/**
 * A real 24-hour clock time, not just "two digits, colon, two digits" — that
 * looser form accepts '25:99', which then parses to null and silently records
 * zero minutes.
 */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** '' from a cleared <input type="time"> becomes null, as the date inputs do. */
const timeField = z
  .string()
  .regex(HHMM, 'Use HH:MM')
  .nullable()
  .default(null)
  .or(z.literal('').transform(() => null));

const entryFields = {
  date: z.string().min(1, 'Date is required').default(''),
  projectId: z.string().nullable().default(null).or(z.literal('').transform(() => null)),
  workType: z.enum(WORK_TYPE_VALUES).default('development'),
  startTime: timeField,
  endTime: timeField,
  reason: z.string().max(500).default(''),
  status: z.enum(ENTRY_STATUS_VALUES).default('pending'),
};

export const timeEntrySchema = z.object(entryFields);

export type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

/** Blank form, derived from the schema so the two can't drift. */
export const emptyTimeEntryForm = (): TimeEntryFormData => timeEntrySchema.parse({ date: ' ' });
