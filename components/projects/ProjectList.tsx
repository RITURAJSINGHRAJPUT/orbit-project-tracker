'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { Project } from '@/lib/types';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  /**
   * False until the first IndexedDB read settles. Gating on this rather than
   * `isLoading` matters twice over: `isLoading` starts false, so the empty
   * state would flash before loading even begins; and it flips back to true on
   * every background sync refresh, which would blank an already-populated list.
   */
  hasLoaded: boolean;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  emptyMessage?: string;
}

export function ProjectList({ projects, hasLoaded, onView, onEdit, emptyMessage }: ProjectListProps) {
  if (!hasLoaded) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="orbit-card p-4 animate-pulse"
            style={{ height: 160, opacity: 0.5 - i * 0.1 }}
          >
            <div className="h-4 rounded mb-2" style={{ background: 'var(--muted-bg)', width: '60%' }} />
            <div className="h-3 rounded mb-4" style={{ background: 'var(--muted-bg)', width: '40%' }} />
            <div className="h-1.5 rounded" style={{ background: 'var(--muted-bg)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-8 text-center"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--muted-bg)' }}
        >
          <FolderOpen size={36} style={{ color: 'var(--muted)' }} />
        </div>
        <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          No projects here
        </p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {emptyMessage ?? 'Tap + to add your first project'}
        </p>
      </motion.div>
    );
  }

  return (
    // Single column on phones; two per row once there's room for them.
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
      <AnimatePresence mode="popLayout">
        {projects.map((project, i) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={i}
            onView={onView}
            onEdit={onEdit}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
