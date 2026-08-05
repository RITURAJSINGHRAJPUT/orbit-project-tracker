'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProjectFormData } from '@/lib/validations/project.schema';
import {
  PROJECT_TYPE_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  ProjectStatus,
  ProjectPriority,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { CollapsibleSection, Field, fieldStyle } from './FormPrimitives';

/**
 * Chip colours per value. `Record<Union, …>` so adding a status or priority is
 * a compile error here rather than a runtime `undefined` when the chip renders.
 */
const STATUS_CHIP: Record<ProjectStatus, string> = {
  draft: '#94A3B8',
  'requirement-gathering': '#8B5CF6',
  planning: '#F59E0B',
  'in-progress': '#3B82F6',
  'on-hold': '#F97316',
  testing: '#06B6D4',
  completed: '#10B981',
  cancelled: '#EF4444',
  archived: '#94A3B8',
};

const PRIORITY_CHIP: Record<ProjectPriority, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

/** Archived isn't a lifecycle step — it's set by the ⋮ menu, not chosen here. */
const SELECTABLE_STATUSES = (Object.keys(STATUS_LABELS) as ProjectStatus[]).filter(
  (s) => s !== 'archived'
);

function ChipGroup<T extends string>({
  options,
  labels,
  colors,
  value,
  onChange,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  colors: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        const color = colors[opt];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
              active && 'ring-1'
            )}
            style={{
              background: active ? `${color}1F` : 'var(--muted-bg)',
              color: active ? color : 'var(--muted)',
              borderColor: active ? `${color}66` : 'transparent',
              border: `1px solid ${active ? `${color}66` : 'transparent'}`,
            }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

export function FormBasics() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProjectFormData>();

  return (
    <CollapsibleSection title="Basic Information" defaultOpen>
      <Field label="Project Name *" error={errors.title?.message}>
        <Input
          {...register('title')}
          name="title"
          placeholder="e.g. Shiftly Dashboard"
          style={fieldStyle}
          className="h-11"
        />
      </Field>

      <Field label="Client / Organization">
        <Input
          {...register('client')}
          placeholder="e.g. Bookends Hospitality"
          style={fieldStyle}
          className="h-11"
        />
      </Field>

      <Field label="Project Type">
        <select
          {...register('type')}
          className="h-11 w-full px-3 text-sm outline-none"
          style={fieldStyle}
        >
          {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Status">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <ChipGroup
              options={SELECTABLE_STATUSES}
              labels={STATUS_LABELS}
              colors={STATUS_CHIP}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Field>

      <Field label="Priority">
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <ChipGroup
              options={['low', 'medium', 'high', 'critical'] as const}
              labels={PRIORITY_LABELS}
              colors={PRIORITY_CHIP}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Field>

      <Field label="Description">
        <Textarea
          {...register('description')}
          placeholder="Brief project description..."
          rows={3}
          style={fieldStyle}
          className="text-sm"
        />
      </Field>
    </CollapsibleSection>
  );
}
