import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';

/**
 * Time-of-day and duration helpers for the Extra Working Hours module.
 *
 * Kept separate from lib/utils.ts, which is already a mix of styling, date and
 * id helpers. Nothing in the app handled clock times before this.
 */

const MINUTES_PER_DAY = 24 * 60;

/** 'HH:MM' → minutes since midnight. Null for empty or malformed input. */
export function parseHHMM(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes since midnight → 'HH:MM'. */
export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Worked minutes between two clock times.
 *
 * Crossing midnight is the case that matters: 19:10 → 02:00 is 6h50m of work,
 * not −17h10m. Any end at or before the start is treated as the next day, so a
 * shift can never produce a negative duration.
 *
 * Equal times mean a full 24 hours rather than zero — someone entering
 * 22:00 → 22:00 worked a day, and zero would silently swallow it.
 *
 * Returns null when either side is missing or malformed, so the caller can show
 * a dash rather than a misleading 00:00.
 */
export function minutesBetween(
  start: string | null | undefined,
  end: string | null | undefined
): number | null {
  const from = parseHHMM(start);
  const to = parseHHMM(end);
  if (from == null || to == null) return null;
  return to > from ? to - from : to - from + MINUTES_PER_DAY;
}

/** Minutes → 'HH:MM' duration. Hours are not capped at 24. */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const sumMinutes = (values: Array<number | null | undefined>): number =>
  values.reduce<number>((total, v) => total + (v ?? 0), 0);

export interface MonthDay {
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'Wednesday' */
  weekday: string;
  isWeekend: boolean;
}

/** Every day of a month, for the report's optional blank rows. */
export function monthDays(month: string): MonthDay[] {
  const start = startOfMonth(parseMonth(month));
  return eachDayOfInterval({ start, end: endOfMonth(start) }).map((d) => ({
    date: format(d, 'yyyy-MM-dd'),
    weekday: format(d, 'EEEE'),
    isWeekend: d.getDay() === 0 || d.getDay() === 6,
  }));
}

/** 'YYYY-MM' → a Date on the first of that month, in local time. */
export function parseMonth(month: string): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1);
}

/** A Date (or today) → 'YYYY-MM', the month key used throughout the module. */
export const toMonthKey = (date: Date = new Date()): string => format(date, 'yyyy-MM');

/** 'YYYY-MM' → 'July 2026'. */
export const formatMonth = (month: string): string => format(parseMonth(month), 'MMMM yyyy');

/** 'YYYY-MM-DD' → 'Wednesday'. */
export const weekdayOf = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return format(new Date(y, m - 1, d), 'EEEE');
};

/** True when 'YYYY-MM-DD' falls inside 'YYYY-MM'. */
export const isInMonth = (date: string, month: string): boolean => date.startsWith(month);
