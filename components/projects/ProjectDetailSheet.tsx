'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  X, Edit2, ExternalLink, Calendar, Clock,
  GitBranch, Pen, Globe, Server, BookOpen, FolderOpen,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProjectSection as Section } from './ProjectSection';
import {
  Project,
  PRIORITY_COLORS,
  STATUS_COLORS,
  PROJECT_TYPE_LABELS,
  LINK_FIELDS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  PHASE_FIELDS,
  PHASE_STATUS_LABELS,
  DOCUMENT_FIELDS,
  pendingAmount,
  hasPhaseData,
} from '@/lib/types';
import { formatDate, formatRelativeDate, getDueDateLabel, getProgressColor, isProjectComplete, cn } from '@/lib/utils';
import { FileText, Phone, User } from 'lucide-react';

interface ProjectDetailSheetProps {
  open: boolean;
  onClose: () => void;
  onEdit: (project: Project) => void;
  project: Project | null;
}

const LINK_ICONS = { GitBranch, Pen, Globe, Server, BookOpen, FolderOpen } as const;

/**
 * Read-only view of a project — what opens when you tap a card.
 *
 * Shows everything the card can't fit: description, all tech entries (the card
 * truncates to two), modules, links, notes, tags and the full date set. Every
 * section is omitted when empty, so a sparse project renders a short sheet
 * rather than a column of empty headings.
 */
export function ProjectDetailSheet({ open, onClose, onEdit, project }: ProjectDetailSheetProps) {
  const reduceMotion = useReducedMotion();

  if (!project) return null;

  const { label: dueLabel, color: dueColor } = getDueDateLabel(project.expectedEndDate ?? project.dueDate);
  const progressColor = getProgressColor(project.progress);
  const complete = isProjectComplete(project.progress, project.status);

  const links = LINK_FIELDS.map((field) => ({
    ...field,
    value: (project.links?.[field.key] ?? '').trim(),
  })).filter((l) => l.value.length > 0);

  const documents = DOCUMENT_FIELDS.map((f) => ({
    ...f,
    url: (project.documents?.[f.key]?.url ?? '').trim(),
  })).filter((d) => d.url.length > 0);

  const team = project.team;
  const teamRows = [
    { label: 'Project Manager', value: team?.projectManager },
    { label: 'Team Lead', value: team?.teamLead },
    { label: 'QA', value: team?.qa },
    { label: 'Developers', value: team?.developers?.join(', ') },
    { label: 'Designers', value: team?.designers?.join(', ') },
  ].filter((r) => r.value);

  const budget = project.budget;
  const outstanding = budget ? pendingAmount(budget) : null;
  const hasBudget = !!budget && (budget.estimated != null || budget.final != null || budget.received != null);

  const money = (n: number | null | undefined) =>
    n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const dates = [
    { label: 'Start', value: project.startDate ? formatDate(project.startDate) : null },
    { label: 'Estimated End', value: project.expectedEndDate ? formatDate(project.expectedEndDate) : null },
    { label: 'Due', value: project.dueDate ? formatDate(project.dueDate) : null },
  ].filter((d) => d.value);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="p-0 border-0 rounded-t-3xl overflow-hidden mx-auto w-full sm:max-w-2xl"
        style={{ background: 'var(--card)', height: '90dvh' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader
            className="flex-shrink-0 px-5 pt-5 pb-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SheetTitle
                  className="text-lg font-bold leading-tight"
                  style={{ color: 'var(--foreground)' }}
                >
                  {project.title}
                </SheetTitle>
                {project.client && (
                  <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                    {project.client}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  STATUS_COLORS[project.status]
                )}
              >
                {STATUS_LABELS[project.status]}
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                  PRIORITY_COLORS[project.priority]
                )}
              >
                {PRIORITY_LABELS[project.priority]}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
              >
                {PROJECT_TYPE_LABELS[project.type]}
              </span>
            </div>

            {/* Drag handle */}
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
              style={{ background: 'var(--border)' }}
            />
          </SheetHeader>

          {/* Body */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-5 py-5 space-y-6">
              {/* Progress — the focal element */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                    Progress
                  </span>
                  <span className="text-2xl font-bold leading-none" style={{ color: progressColor }}>
                    {project.progress}%
                  </span>
                </div>
                <div
                  className="h-2.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--muted-bg)' }}
                >
                  <motion.div
                    className={cn('h-full rounded-full', !complete && 'orbit-progress-active')}
                    style={{
                      background: `linear-gradient(90deg, ${progressColor}, ${progressColor}88)`,
                    }}
                    initial={{ width: reduceMotion ? `${project.progress}%` : 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.9, delay: 0.15, ease: 'easeOut' }
                    }
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Dates */}
              {(dates.length > 0 || dueLabel) && (
                <Section title="Timeline">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {dates.map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                          {label}
                        </p>
                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    <span className={cn('font-medium flex items-center gap-1.5', dueColor)}>
                      <Calendar size={12} />
                      {dueLabel}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      Updated {formatRelativeDate(project.updatedAt)}
                    </span>
                  </div>
                </Section>
              )}

              {project.description && (
                <Section title="Description">
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {project.description}
                  </p>
                </Section>
              )}

              {project.techStack.length > 0 && (
                <Section title="Technology Stack">
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tech) => (
                      <span key={tech} className="chip active">
                        {tech}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {project.modules.length > 0 && (
                <Section title="Project Modules">
                  <div className="flex flex-wrap gap-2">
                    {project.modules.map((mod) => (
                      <span
                        key={mod}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          background: 'rgba(59,130,246,0.1)',
                          border: '1px solid rgba(59,130,246,0.3)',
                          color: 'var(--primary)',
                        }}
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {links.length > 0 && (
                <Section title="Links">
                  <div className="space-y-2">
                    {links.map(({ key, label, icon, value }) => {
                      const Icon = LINK_ICONS[icon];
                      return (
                        <a
                          key={key}
                          href={value}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors"
                        >
                          <span
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--muted-bg)' }}
                          >
                            <Icon size={16} style={{ color: 'var(--muted)' }} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className="block text-sm font-medium"
                              style={{ color: 'var(--foreground)' }}
                            >
                              {label}
                            </span>
                            <span
                              className="block text-xs truncate"
                              style={{ color: 'var(--muted)' }}
                            >
                              {value}
                            </span>
                          </span>
                          <ExternalLink
                            size={14}
                            className="flex-shrink-0"
                            style={{ color: 'var(--muted)' }}
                          />
                        </a>
                      );
                    })}
                  </div>
                </Section>
              )}

              {project.notes && (
                <Section title="Notes">
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {project.notes}
                  </p>
                </Section>
              )}

              {/* Phases — only when they've actually been used. There's no phase
                  editor in the form, so an untouched project would otherwise show
                  four empty rows. */}
              {hasPhaseData(project.phases) && (
              <Section title="Phases">
                <div className="space-y-2.5">
                  {PHASE_FIELDS.map(({ key, label }) => {
                    const phase = project.phases?.[key];
                    const pct = phase?.progress ?? 0;
                    const done = phase?.status === 'completed';
                    const blocked = phase?.status === 'blocked';
                    const color = blocked ? 'var(--danger)' : done ? '#10B981' : 'var(--primary)';
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span style={{ color: 'var(--foreground)' }}>{label}</span>
                          <span style={{ color: 'var(--muted)' }}>
                            {PHASE_STATUS_LABELS[phase?.status ?? 'not-started']} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted-bg)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        {phase?.notes && (
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                            {phase.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
              )}

              {(project.pocName || project.pocPhone) && (
                <Section title="Point of Contact">
                  <div className="space-y-1.5 text-sm">
                    {project.pocName && (
                      <p className="flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                        <User size={13} style={{ color: 'var(--muted)' }} />
                        {project.pocName}
                      </p>
                    )}
                    {project.pocPhone && (
                      <a
                        href={`tel:${project.pocPhone}`}
                        className="flex items-center gap-2"
                        style={{ color: 'var(--primary)' }}
                      >
                        <Phone size={13} />
                        {project.pocPhone}
                      </a>
                    )}
                  </div>
                </Section>
              )}

              {(project.clientCompany || project.clientGst || project.clientAddress || project.clientWebsite || project.clientNotes) && (
                <Section title="Client">
                  <div className="space-y-1.5 text-sm" style={{ color: 'var(--foreground)' }}>
                    {project.clientCompany && <p>{project.clientCompany}</p>}
                    {project.clientGst && (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>GST {project.clientGst}</p>
                    )}
                    {project.clientWebsite && (
                      <a href={project.clientWebsite} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--primary)' }}>
                        {project.clientWebsite}
                      </a>
                    )}
                    {project.clientAddress && (
                      <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--muted)' }}>{project.clientAddress}</p>
                    )}
                    {project.clientNotes && (
                      <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--muted)' }}>{project.clientNotes}</p>
                    )}
                  </div>
                </Section>
              )}

              {teamRows.length > 0 && (
                <Section title="Team">
                  <div className="space-y-1.5">
                    {teamRows.map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-3 text-sm">
                        <span style={{ color: 'var(--muted)' }}>{label}</span>
                        <span className="text-right" style={{ color: 'var(--foreground)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {documents.length > 0 && (
                <Section title="Documents">
                  <div className="space-y-2">
                    {documents.map(({ key, label, url }) => (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-3 rounded-xl p-2 -mx-2"
                      >
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--muted-bg)' }}
                        >
                          <FileText size={16} style={{ color: 'var(--muted)' }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
                          <span className="block text-xs truncate" style={{ color: 'var(--muted)' }}>{url}</span>
                        </span>
                        <ExternalLink size={14} className="flex-shrink-0" style={{ color: 'var(--muted)' }} />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {hasBudget && (
                <Section title="Budget">
                  <div className="space-y-1.5 text-sm">
                    {[
                      { label: 'Estimated', value: money(budget?.estimated) },
                      { label: 'Final', value: money(budget?.final) },
                      { label: 'Received', value: money(budget?.received) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span style={{ color: 'var(--muted)' }}>{label}</span>
                        <span style={{ color: 'var(--foreground)' }}>{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--muted)' }}>Pending</span>
                      <span className="font-semibold" style={{ color: outstanding && outstanding > 0 ? 'var(--warning)' : '#10B981' }}>
                        {money(outstanding)}
                      </span>
                    </div>
                  </div>
                </Section>
              )}

              {(project.requirements || project.deliverables) && (
                <Section title="Scope">
                  {project.requirements && (
                    <div>
                      <p className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>Requirements</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>{project.requirements}</p>
                    </div>
                  )}
                  {project.deliverables && (
                    <div>
                      <p className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>Deliverables</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>{project.deliverables}</p>
                    </div>
                  )}
                </Section>
              )}

              {(project.internalNotes || project.meetingNotes) && (
                <Section title="More Notes">
                  {project.internalNotes && (
                    <div>
                      <p className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>Internal</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>{project.internalNotes}</p>
                    </div>
                  )}
                  {project.meetingNotes && (
                    <div>
                      <p className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>Meetings</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>{project.meetingNotes}</p>
                    </div>
                  )}
                </Section>
              )}

              {project.tags.length > 0 && (
                <Section title="Tags">
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              <p className="text-[11px] pt-1" style={{ color: 'var(--muted)' }}>
                Created {formatDate(project.createdAt)}
              </p>

              <div className="h-2" />
            </div>
          </ScrollArea>

          {/* Footer */}
          <div
            className="flex-shrink-0 p-4 border-t"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <Button
              id="detail-edit-button"
              onClick={() => onEdit(project)}
              className="w-full h-12 rounded-2xl text-base font-semibold"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
              }}
            >
              <Edit2 size={18} className="mr-2" />
              Edit Project
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
