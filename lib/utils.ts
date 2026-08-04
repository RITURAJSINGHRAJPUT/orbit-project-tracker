import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export function getDueDateLabel(dateStr: string | null | undefined): { label: string; color: string } {
  if (!dateStr) return { label: 'No due date', color: 'text-muted-foreground' };
  try {
    const days = differenceInDays(new Date(dateStr), new Date());
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'text-red-400' };
    if (days === 0) return { label: 'Due today', color: 'text-orange-400' };
    if (days === 1) return { label: 'Due tomorrow', color: 'text-orange-400' };
    if (days <= 7) return { label: `Due in ${days} days`, color: 'text-yellow-400' };
    return { label: `Due ${format(new Date(dateStr), 'MMM d')}`, color: 'text-muted-foreground' };
  } catch {
    return { label: '—', color: 'text-muted-foreground' };
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Progress bar colour. Shared by the project card and the detail sheet so a
 * project reads the same in both places.
 */
export function getProgressColor(progress: number): string {
  if (progress >= 80) return '#10B981';
  if (progress >= 50) return '#3B82F6';
  if (progress >= 25) return '#F59E0B';
  return '#94A3B8';
}

/**
 * A project is "done" if it's at 100% or explicitly marked completed. Shared so
 * the card and the detail sheet agree on when to stop the progress shimmer.
 */
export function isProjectComplete(progress: number, status: string): boolean {
  return progress >= 100 || status === 'completed';
}
