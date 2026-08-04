'use client';

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { cn } from '@/lib/utils';

const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'critical'] as const;
const TYPE_OPTIONS = [
  'all', 'website', 'web-app', 'mobile-app', 'ai-automation', 'api', 'internal-tool', 'other',
] as const;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'progress', label: 'Progress' },
] as const;

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
}

export function FilterSheet({ open, onClose }: FilterSheetProps) {
  const { filters, setFilters } = useProjectStore();

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent
        style={{ background: 'var(--card)', border: 'none' }}
        // Matches the content column above `sm` rather than spanning the viewport
        className="rounded-t-3xl px-5 pb-8 mx-auto w-full sm:max-w-2xl"
      >
        <DrawerHeader className="px-0 pt-2 pb-4">
          <div
            className="w-10 h-1 rounded-full mx-auto mb-4"
            style={{ background: 'var(--border)' }}
          />
          <DrawerTitle className="text-left text-base font-bold" style={{ color: 'var(--foreground)' }}>
            Filter &amp; Sort
          </DrawerTitle>
        </DrawerHeader>

        {/* Priority */}
        <FilterGroup label="Priority">
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <FilterChip
                key={p}
                label={p === 'all' ? 'All' : p}
                active={filters.priority === p}
                onClick={() => setFilters({ priority: p })}
              />
            ))}
          </div>
        </FilterGroup>

        {/* Type */}
        <FilterGroup label="Project Type">
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((t) => {
              const label = t === 'all' ? 'All' : t === 'web-app' ? 'Web App' :
                t === 'mobile-app' ? 'Mobile App' : t === 'ai-automation' ? 'AI' :
                t === 'internal-tool' ? 'Internal' : t.charAt(0).toUpperCase() + t.slice(1);
              return (
                <FilterChip
                  key={t}
                  label={label}
                  active={filters.type === t}
                  onClick={() => setFilters({ type: t })}
                />
              );
            })}
          </div>
        </FilterGroup>

        {/* Sort */}
        <FilterGroup label="Sort By">
          <div className="grid grid-cols-3 gap-2">
            {SORT_OPTIONS.map(({ value, label }) => (
              <FilterChip
                key={value}
                label={label}
                active={filters.sortBy === value}
                onClick={() => setFilters({ sortBy: value })}
              />
            ))}
          </div>
        </FilterGroup>

        {/* Reset */}
        <button
          onClick={() => setFilters({ priority: 'all', type: 'all', sortBy: 'newest' })}
          className="mt-4 w-full h-11 rounded-2xl text-sm font-medium transition-colors"
          style={{
            background: 'var(--muted-bg)',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
          }}
        >
          Reset Filters
        </button>
      </DrawerContent>
    </Drawer>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="chip capitalize"
      style={
        active
          ? {
              background: 'rgba(59,130,246,0.15)',
              borderColor: 'rgba(59,130,246,0.4)',
              color: '#3B82F6',
            }
          : {}
      }
    >
      {label}
    </button>
  );
}
