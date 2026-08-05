'use client';

import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  projectSchema,
  emptyProjectForm,
  type ProjectFormData,
} from '@/lib/validations/project.schema';
import type { Project } from '@/lib/types';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { FormBasics } from './form/FormBasics';
import { FormContact } from './form/FormClient';
import { FormTimeline } from './form/FormPhases';

interface ProjectFormSheetProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}

/** The record-level keys the form doesn't own. */
const NON_FORM_KEYS = ['id', 'createdAt', 'updatedAt', 'syncStatus', 'deletedAt'] as const;

/**
 * Builds form values from a saved project by taking the blank form and
 * overlaying whatever the project has.
 *
 * Deliberately generic rather than a hand-written field list: the previous
 * version listed every field twice (once as defaults, once in the reset), and
 * the drift between those two lists is what shipped a bug where "+ New" opened
 * pre-filled with the last edited project. A new field can no longer be
 * forgotten here.
 */
function toFormValues(project: Project): ProjectFormData {
  const blank = emptyProjectForm();
  const values = { ...blank } as Record<string, unknown>;
  const source = project as unknown as Record<string, unknown>;

  for (const key of Object.keys(blank)) {
    if ((NON_FORM_KEYS as readonly string[]).includes(key)) continue;
    if (source[key] !== undefined && source[key] !== null) values[key] = source[key];
    else if (blank[key as keyof ProjectFormData] === null) values[key] = null;
  }

  return values as ProjectFormData;
}

export function ProjectFormSheet({ open, onClose, project }: ProjectFormSheetProps) {
  const { addProject, updateProject } = useProjectStore();
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = !!project;

  const methods = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as never,
    defaultValues: emptyProjectForm(),
  });
  const { handleSubmit, reset } = methods;

  useEffect(() => {
    // Always pass explicit values. A bare reset() falls back to react-hook-form's
    // internal _defaultValues, which reset(values) overwrites — so after editing
    // any project, "+ New" would restore that project instead of a blank form.
    reset(project ? toFormValues(project) : emptyProjectForm());
  }, [project, reset, open]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSaving(true);
    try {
      if (isEdit && project) {
        await updateProject(project.id, data);
        toast.success('Project updated!');
      } else {
        await addProject(data);
        toast.success('Project created!');
      }
      onClose();
    } catch {
      toast.error('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="p-0 border-0 rounded-t-3xl overflow-hidden mx-auto w-full sm:max-w-2xl"
        style={{ background: 'var(--card)', height: '95dvh' }}
      >
        <div className="flex flex-col h-full">
          <SheetHeader
            className="flex-shrink-0 px-5 pt-5 pb-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {isEdit ? 'Edit Project' : 'New Project'}
              </SheetTitle>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
              style={{ background: 'var(--border)' }}
            />
          </SheetHeader>

          <ScrollArea className="flex-1 overflow-y-auto">
            <FormProvider {...methods}>
              {/*
                One useForm shared by the sections through context. The record
                is larger than this form — team, budget, documents, links,
                phases and client details still exist, still sync and still show
                in the detail sheet; they just have no editor. addProject builds
                on emptyProjectRecord() so they're never left undefined.
              */}
              <form className="px-5 py-4 space-y-3">
                <FormBasics />
                <FormContact />
                <FormTimeline />
                <div className="h-4" />
              </form>
            </FormProvider>
          </ScrollArea>

          <div
            className="flex-shrink-0 p-4 border-t"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="w-full h-12 rounded-2xl text-base font-semibold"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
              }}
            >
              {isSaving ? (
                <Loader2 size={20} className="animate-spin mr-2" />
              ) : (
                <Save size={18} className="mr-2" />
              )}
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
