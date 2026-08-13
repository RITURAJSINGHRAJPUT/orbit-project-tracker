'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Field, fieldStyle } from '@/components/projects/form/FormPrimitives';
import {
  timeEntrySchema,
  emptyTimeEntryForm,
  type TimeEntryFormData,
} from '@/lib/validations/time-entry.schema';
import { TimeEntry, WORK_TYPE_LABELS, ENTRY_STATUS_LABELS } from '@/lib/types';
import { useTimeEntryStore } from '@/lib/store/useTimeEntryStore';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { formatDuration, minutesBetween } from '@/lib/time';

interface TimeEntrySheetProps {
  open: boolean;
  onClose: () => void;
  entry?: TimeEntry | null;
  /** Pre-fills the date when adding from a specific day. */
  defaultDate?: string;
}

function toFormValues(entry: TimeEntry): TimeEntryFormData {
  return {
    date: entry.date,
    projectId: entry.projectId,
    workType: entry.workType,
    startTime: entry.startTime,
    endTime: entry.endTime,
    reason: entry.reason,
    status: entry.status,
  };
}

export function TimeEntrySheet({ open, onClose, entry, defaultDate }: TimeEntrySheetProps) {
  const { addEntry, updateEntry, deleteEntry } = useTimeEntryStore();
  const projects = useProjectStore((s) => s.projects);
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = !!entry;

  const { register, handleSubmit, reset, control, watch, formState: { errors } } =
    useForm<TimeEntryFormData>({
      resolver: zodResolver(timeEntrySchema) as never,
      defaultValues: emptyTimeEntryForm(),
    });

  useEffect(() => {
    // Always pass explicit values — a bare reset() falls back to react-hook-form's
    // internal defaults, which reset(values) overwrites, so "+ Add" would reopen
    // pre-filled with the last edited entry.
    reset(entry ? toFormValues(entry) : { ...emptyTimeEntryForm(), date: defaultDate ?? '' });
  }, [entry, defaultDate, reset, open]);

  // Live preview, recomputed as the two time fields change.
  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const previewMinutes = minutesBetween(startTime, endTime);

  const onSubmit = async (data: TimeEntryFormData) => {
    setIsSaving(true);
    try {
      if (isEdit && entry) {
        await updateEntry(entry.id, data);
        toast.success('Entry updated');
      } else {
        await addEntry(data);
        toast.success('Extra hours logged');
      }
      onClose();
    } catch {
      toast.error('Could not save the entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    await deleteEntry(entry.id);
    toast('Entry deleted');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="p-0 border-0 rounded-t-3xl overflow-hidden mx-auto w-full sm:max-w-2xl"
        style={{ background: 'var(--card)', height: '92dvh' }}
      >
        <div className="flex flex-col h-full">
          <SheetHeader
            className="flex-shrink-0 px-5 pt-5 pb-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {isEdit ? 'Edit Extra Hours' : 'Add Extra Working Hours'}
              </SheetTitle>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center"
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
            <form className="px-5 py-4 space-y-4">
              <Field label="Date *" error={errors.date?.message}>
                <Input {...register('date')} name="date" type="date" style={fieldStyle} className="h-11 text-sm" />
              </Field>

              <Field label="Project">
                <select {...register('projectId')} className="h-11 w-full px-3 text-sm outline-none" style={fieldStyle}>
                  <option value="">— None —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Work Type">
                <select {...register('workType')} className="h-11 w-full px-3 text-sm outline-none" style={fieldStyle}>
                  {Object.entries(WORK_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Time" error={errors.startTime?.message}>
                  <Controller
                    control={control}
                    name="startTime"
                    render={({ field }) => (
                      <Input
                        type="time"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        style={fieldStyle}
                        className="h-11 text-sm"
                      />
                    )}
                  />
                </Field>
                <Field label="End Time" error={errors.endTime?.message}>
                  <Controller
                    control={control}
                    name="endTime"
                    render={({ field }) => (
                      <Input
                        type="time"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        style={fieldStyle}
                        className="h-11 text-sm"
                      />
                    )}
                  />
                </Field>
              </div>

              {/* Calculated, never typed — including shifts that cross midnight. */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}
              >
                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                  Extra Hours
                  <span className="ml-2 text-[10px] uppercase tracking-wider">auto</span>
                </span>
                <span
                  id="extra-hours-preview"
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: 'var(--primary)' }}
                >
                  {formatDuration(previewMinutes)}
                </span>
              </div>

              <Field label="Reason / Remark">
                <Textarea
                  {...register('reason')}
                  placeholder="Client requirement / urgent task"
                  rows={3}
                  style={fieldStyle}
                  className="text-sm"
                />
              </Field>

              <Field label="Status">
                <select {...register('status')} className="h-11 w-full px-3 text-sm outline-none" style={fieldStyle}>
                  {Object.entries(ENTRY_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-sm py-2"
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={14} />
                  Delete this entry
                </button>
              )}

              <div className="h-2" />
            </form>
          </ScrollArea>

          <div
            className="flex-shrink-0 p-4 border-t"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <Button
              id="save-entry"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="w-full h-12 rounded-2xl text-base font-semibold"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
              }}
            >
              {isSaving ? <Loader2 size={20} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Entry'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
