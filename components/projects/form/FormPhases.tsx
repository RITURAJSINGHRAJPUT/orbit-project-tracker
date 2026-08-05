'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { ProjectFormData } from '@/lib/validations/project.schema';
import { getProgressColor } from '@/lib/utils';
import { CollapsibleSection, Field, fieldStyle } from './FormPrimitives';

/** Rolls to the new value instead of snapping. */
function AnimatedPercent({ value, color }: { value: number; color: string }) {
  const spring = useSpring(value, { stiffness: 220, damping: 26 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  spring.set(value);
  return (
    <span className="text-2xl font-bold tabular-nums" style={{ color }}>
      <motion.span>{rounded}</motion.span>%
    </span>
  );
}

export function FormTimeline() {
  const { register, control } = useFormContext<ProjectFormData>();
  const progress = useWatch({ control, name: 'progress' }) ?? 0;
  const color = getProgressColor(progress);

  return (
    <CollapsibleSection title="Timeline & Progress" badge={`${progress}%`}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date">
          <Input {...register('startDate')} type="date" style={fieldStyle} className="h-11 text-sm" />
        </Field>
        <Field label="Estimated End Date">
          <Input
            {...register('expectedEndDate')}
            type="date"
            style={fieldStyle}
            className="h-11 text-sm"
          />
        </Field>
      </div>

      <div className="pt-1">
        <div className="flex justify-between items-end mb-3">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            Progress
          </span>
          <AnimatedPercent value={progress} color={color} />
        </div>
        <Controller
          control={control}
          name="progress"
          render={({ field }) => (
            <Slider
              className="orbit-slider"
              value={[field.value ?? 0]}
              onValueChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)}
              min={0}
              max={100}
              step={5}
            />
          )}
        />
        <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
