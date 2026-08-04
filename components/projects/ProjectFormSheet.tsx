'use client';

import { useEffect, useCallback, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, GitBranch, Pen, Globe, Server, BookOpen, FolderOpen,
  ChevronDown, Loader2, Save,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { projectSchema, ProjectFormData } from '@/lib/validations/project.schema';
import { Project, TECH_STACK_OPTIONS, PROJECT_TYPE_LABELS } from '@/lib/types';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectFormSheetProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}

const STATUS_OPTIONS = ['pending', 'ongoing', 'completed'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;

const PRIORITY_COLORS_MAP = {
  low: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)', text: '#10B981' },
  medium: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', text: '#F59E0B' },
  high: { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', text: '#F97316' },
  critical: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#EF4444' },
};

const STATUS_COLORS_MAP = {
  pending: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', text: '#F59E0B' },
  ongoing: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)', text: '#3B82F6' },
  completed: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)', text: '#10B981' },
};

const LINK_FIELDS = [
  { key: 'github', label: 'GitHub', icon: GitBranch, placeholder: 'https://github.com/...' },
  { key: 'figma', label: 'Figma', icon: Pen, placeholder: 'https://figma.com/...' },
  { key: 'production', label: 'Production', icon: Globe, placeholder: 'https://...' },
  { key: 'staging', label: 'Staging', icon: Server, placeholder: 'https://staging...' },
  { key: 'documentation', label: 'Docs', icon: BookOpen, placeholder: 'https://docs...' },
  { key: 'drive', label: 'Google Drive', icon: FolderOpen, placeholder: 'https://drive.google.com/...' },
] as const;

export function ProjectFormSheet({ open, onClose, project }: ProjectFormSheetProps) {
  const { addProject, updateProject } = useProjectStore();
  const [isSaving, setIsSaving] = useState(false);
  const [newModule, setNewModule] = useState('');

  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      title: '',
      client: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      type: 'web-app',
      progress: 0,
      startDate: null,
      dueDate: null,
      techStack: [],
      modules: [],
      links: {},
      notes: '',
      tags: [],
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (project) {
      reset({
        title: project.title,
        client: project.client,
        description: project.description,
        status: project.status as 'pending' | 'ongoing' | 'completed',
        priority: project.priority,
        type: project.type,
        progress: project.progress,
        startDate: project.startDate,
        dueDate: project.dueDate,
        techStack: project.techStack,
        modules: project.modules,
        links: project.links,
        notes: project.notes,
        tags: project.tags,
      });
    } else {
      reset();
    }
  }, [project, reset, open]);

  const watchedTechStack = watch('techStack') ?? [];
  const watchedModules = watch('modules') ?? [];
  const watchedProgress = watch('progress');
  const watchedStatus = watch('status');
  const watchedPriority = watch('priority');

  const toggleTech = (tech: string) => {
    const curr = watchedTechStack;
    if (curr.includes(tech)) {
      setValue('techStack', curr.filter((t) => t !== tech), { shouldDirty: true });
    } else {
      setValue('techStack', [...curr, tech], { shouldDirty: true });
    }
  };

  const addModule = () => {
    const trimmed = newModule.trim();
    if (!trimmed || watchedModules.includes(trimmed)) return;
    setValue('modules', [...watchedModules, trimmed], { shouldDirty: true });
    setNewModule('');
  };

  const removeModule = (mod: string) => {
    setValue('modules', watchedModules.filter((m) => m !== mod), { shouldDirty: true });
  };

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
    } catch (err) {
      toast.error('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const fieldStyle = {
    background: 'var(--muted-bg)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    borderRadius: '10px',
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        // The header below supplies its own close button; suppress the built-in
        // one so they don't stack on top of each other.
        showCloseButton={false}
        // Full-bleed on phones, capped to the content column width above `sm`
        // instead of stretching a form across a desktop viewport.
        className="p-0 border-0 rounded-t-3xl overflow-hidden mx-auto w-full sm:max-w-2xl"
        style={{
          background: 'var(--card)',
          height: '95dvh',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="flex-shrink-0 px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {isEdit ? 'Edit Project' : 'New Project'}
              </SheetTitle>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            {/* Drag handle */}
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
              style={{ background: 'var(--border)' }}
            />
          </SheetHeader>

          {/* Scrollable Form */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-6">

              {/* ── Section 1: Basic Info ── */}
              <Section title="Basic Information">
                {/* Project Name */}
                <div>
                  <Label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Project Name *
                  </Label>
                  <Input
                    {...register('title')}
                    placeholder="e.g. Shiftly Dashboard"
                    style={fieldStyle}
                    className="h-11"
                  />
                  {errors.title && (
                    <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Client */}
                <div>
                  <Label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Client / Organization
                  </Label>
                  <Input
                    {...register('client')}
                    placeholder="e.g. Bookends Hospitality"
                    style={fieldStyle}
                    className="h-11"
                  />
                </div>

                {/* Type */}
                <div>
                  <Label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Project Type
                  </Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <select
                          {...field}
                          className="w-full h-11 px-3 pr-10 appearance-none text-sm rounded-[10px] outline-none"
                          style={fieldStyle}
                        >
                          {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: 'var(--muted)' }}
                        />
                      </div>
                    )}
                  />
                </div>

                {/* Priority */}
                <div>
                  <Label className="mb-2 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Priority
                  </Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-4 gap-2">
                        {PRIORITY_OPTIONS.map((p) => {
                          const colors = PRIORITY_COLORS_MAP[p];
                          const isSelected = field.value === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => field.onChange(p)}
                              className="h-9 rounded-xl text-xs font-semibold capitalize transition-all"
                              style={{
                                background: isSelected ? colors.bg : 'var(--muted-bg)',
                                border: `1px solid ${isSelected ? colors.border : 'var(--border)'}`,
                                color: isSelected ? colors.text : 'var(--muted)',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                              }}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>

                {/* Status */}
                <div>
                  <Label className="mb-2 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Status
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-3 gap-2">
                        {STATUS_OPTIONS.map((s) => {
                          const colors = STATUS_COLORS_MAP[s];
                          const isSelected = field.value === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => field.onChange(s)}
                              className="h-9 rounded-xl text-xs font-semibold capitalize transition-all"
                              style={{
                                background: isSelected ? colors.bg : 'var(--muted-bg)',
                                border: `1px solid ${isSelected ? colors.border : 'var(--border)'}`,
                                color: isSelected ? colors.text : 'var(--muted)',
                              }}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Description
                  </Label>
                  <Textarea
                    {...register('description')}
                    placeholder="Brief project description..."
                    rows={3}
                    style={{ ...fieldStyle, resize: 'none' }}
                  />
                </div>
              </Section>

              {/* ── Section 2: Dates ── */}
              <Section title="Dates">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      {...register('startDate')}
                      style={fieldStyle}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                      Due Date
                    </Label>
                    <Input
                      type="date"
                      {...register('dueDate')}
                      style={fieldStyle}
                      className="h-11"
                    />
                  </div>
                </div>
              </Section>

              {/* ── Section 3: Progress ── */}
              <Section title="Progress">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Completion</span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: 'var(--primary)' }}
                    >
                      {watchedProgress}%
                    </span>
                  </div>
                  <Controller
                    name="progress"
                    control={control}
                    render={({ field }) => (
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[field.value]}
                        onValueChange={(val) => field.onChange(Array.isArray(val) ? val[0] : val)}
                        className="w-full"
                      />
                    )}
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </Section>

              {/* ── Section 4: Tech Stack ── */}
              <Section title="Technology Stack">
                <div className="flex flex-wrap gap-2">
                  {TECH_STACK_OPTIONS.map((tech) => {
                    const selected = watchedTechStack.includes(tech);
                    return (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => toggleTech(tech)}
                        className={cn('chip', selected && 'active')}
                      >
                        {tech}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* ── Section 5: Modules ── */}
              <Section title="Project Modules">
                {/* Add module input */}
                <div className="flex gap-2">
                  <Input
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addModule())}
                    placeholder="Add a module..."
                    style={fieldStyle}
                    className="h-10 flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addModule}
                    className="h-10 w-10 p-0 rounded-xl"
                    style={{ background: 'var(--primary)' }}
                  >
                    <Plus size={18} />
                  </Button>
                </div>

                <AnimatePresence>
                  {watchedModules.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {watchedModules.map((mod) => (
                        <motion.div
                          key={mod}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                          style={{
                            background: 'rgba(59,130,246,0.1)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            color: 'var(--primary)',
                          }}
                        >
                          <span>{mod}</span>
                          <button
                            type="button"
                            onClick={() => removeModule(mod)}
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ color: 'var(--primary)' }}
                          >
                            <X size={10} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </Section>

              {/* ── Section 6: Links ── */}
              <Section title="Links">
                <div className="space-y-3">
                  {LINK_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--muted-bg)' }}
                      >
                        <Icon size={16} style={{ color: 'var(--muted)' }} />
                      </div>
                      <Input
                        {...register(`links.${key}` as any)}
                        placeholder={placeholder}
                        style={fieldStyle}
                        className="h-9 flex-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </Section>

              {/* ── Section 7: Notes ── */}
              <Section title="Notes">
                <Textarea
                  {...register('notes')}
                  placeholder="Project notes, observations, ideas..."
                  rows={5}
                  style={{ ...fieldStyle, resize: 'none' }}
                />
              </Section>

              {/* Bottom padding */}
              <div className="h-4" />
            </form>
          </ScrollArea>

          {/* Save Button */}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
          {title}
        </h3>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
