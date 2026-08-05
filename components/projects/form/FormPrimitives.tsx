'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared field styling — one definition rather than one per section. */
export const fieldStyle = {
  background: 'var(--muted-bg)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
  borderRadius: '10px',
} as const;

/**
 * Collapsible form section.
 *
 * Collapsed sections don't render their children at all. With ~50 fields across
 * ten sections, mounting everything eagerly inside a 95dvh sheet is what makes
 * the form lag on a phone.
 */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: 'var(--muted-bg)' }}
      >
        <span
          className="text-sm font-semibold uppercase tracking-wider flex-1"
          style={{ color: 'var(--primary)' }}
        >
          {title}
        </span>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--card)', color: 'var(--muted)' }}>
            {badge}
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn('transition-transform', open && 'rotate-180')}
          style={{ color: 'var(--muted)' }}
        />
      </button>

      {open && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  );
}

/** Label + optional error, wrapping any control. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
