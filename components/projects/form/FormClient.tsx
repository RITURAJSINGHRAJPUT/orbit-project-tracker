'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { ProjectFormData } from '@/lib/validations/project.schema';
import { CollapsibleSection, Field, fieldStyle } from './FormPrimitives';

export function FormContact() {
  const { register } = useFormContext<ProjectFormData>();

  return (
    <CollapsibleSection title="Point of Contact">
      <Field label="Name">
        <Input {...register('pocName')} placeholder="e.g. Rahul Shah" style={fieldStyle} className="h-11" />
      </Field>
      <Field label="Phone">
        <Input
          {...register('pocPhone')}
          type="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          style={fieldStyle}
          className="h-11"
        />
      </Field>
    </CollapsibleSection>
  );
}
