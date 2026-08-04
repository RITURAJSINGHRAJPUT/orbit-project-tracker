'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, Copy, Archive, ExternalLink, ChevronRight } from 'lucide-react';
import { Project, PRIORITY_COLORS, STATUS_COLORS, PROJECT_TYPE_LABELS } from '@/lib/types';
import { formatRelativeDate, getDueDateLabel, cn } from '@/lib/utils';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { toast } from 'sonner';

interface ProjectCardProps {
  project: Project;
  index?: number;
  onEdit: (project: Project) => void;
}

export function ProjectCard({ project, index = 0, onEdit }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { deleteProject, duplicateProject, archiveProject, restoreProject } = useProjectStore();
  const { label: dueLabel, color: dueColor } = getDueDateLabel(project.dueDate);

  const priorityLabel = project.priority.toUpperCase();
  const progressColor =
    project.progress >= 80
      ? '#10B981'
      : project.progress >= 50
      ? '#3B82F6'
      : project.progress >= 25
      ? '#F59E0B'
      : '#94A3B8';

  const handleDelete = async () => {
    setMenuOpen(false);
    const id = project.id;
    await deleteProject(id);
    toast(`"${project.title}" deleted`, {
      action: {
        label: 'Undo',
        onClick: async () => {
          await restoreProject(id);
          toast(`"${project.title}" restored`);
        },
      },
      duration: 8000,
    });
  };

  const handleDuplicate = async () => {
    setMenuOpen(false);
    await duplicateProject(project.id);
    toast(`"${project.title}" duplicated`);
  };

  const handleArchive = async () => {
    setMenuOpen(false);
    await archiveProject(project.id);
    toast(`"${project.title}" archived`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="orbit-card p-4 cursor-pointer active:scale-[0.99] select-none"
      onClick={() => onEdit(project)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-base leading-tight truncate"
            style={{ color: 'var(--foreground)' }}
          >
            {project.title}
          </h3>
          {project.client && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
              {project.client}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Priority badge */}
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
              PRIORITY_COLORS[project.priority],
              project.priority === 'critical' && 'priority-critical'
            )}
          >
            {priorityLabel}
          </span>

          {/* Menu */}
          <div className="relative">
            <button
              id={`menu-${project.id}`}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              <MoreVertical size={16} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-9 z-50 orbit-card min-w-[160px] py-1 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      { icon: Edit2, label: 'Edit', action: () => { setMenuOpen(false); onEdit(project); } },
                      { icon: Copy, label: 'Duplicate', action: handleDuplicate },
                      { icon: Archive, label: 'Archive', action: handleArchive },
                      { icon: Trash2, label: 'Delete', action: handleDelete, danger: true },
                    ].map(({ icon: Icon, label, action, danger }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                        style={{ color: danger ? 'var(--danger)' : 'var(--foreground)' }}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Project type badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[project.status])}
        >
          {project.status.toUpperCase()}
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
        >
          {PROJECT_TYPE_LABELS[project.type]}
        </span>
        {project.techStack.slice(0, 2).map((tech) => (
          <span
            key={tech}
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)' }}
          >
            {tech}
          </span>
        ))}
        {project.techStack.length > 2 && (
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
            +{project.techStack.length - 2}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            Progress
          </span>
          <span className="text-xs font-bold" style={{ color: progressColor }}>
            {project.progress}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--muted-bg)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${progressColor}, ${progressColor}88)` }}
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 0.8, delay: index * 0.05 + 0.2, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
        <span className={cn('font-medium', dueColor)}>{dueLabel}</span>
        <span>Updated {formatRelativeDate(project.updatedAt)}</span>
      </div>
    </motion.div>
  );
}
