'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectList } from '@/components/projects/ProjectList';
import { SearchBar } from '@/components/projects/SearchBar';
import { ProjectFormSheet } from '@/components/projects/ProjectFormSheet';
import { ProjectDetailSheet } from '@/components/projects/ProjectDetailSheet';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { Project } from '@/lib/types';

export default function ProjectsPage() {
  const { getFilteredProjects, hasLoaded, activeTab, setActiveTab } = useProjectStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewProject, setViewProject] = useState<Project | null>(null);

  const pending = getFilteredProjects('pending');
  const ongoing = getFilteredProjects('ongoing');
  const completed = getFilteredProjects('completed');

  const handleEdit = (project: Project) => {
    setEditProject(project);
    setFormOpen(true);
  };

  // Clearing viewProject is deferred so the sheet keeps its content through the
  // close animation. The handle is kept so a rapid second tap can cancel it —
  // otherwise the stale timer nulls the project while the sheet is reopening,
  // and ProjectDetailSheet renders null with `open` stuck true.
  const detailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearDetailTimer = () => {
    if (detailTimer.current) clearTimeout(detailTimer.current);
    detailTimer.current = null;
  };
  useEffect(() => clearDetailTimer, []);

  // Tapping the card body — read-only.
  const handleView = (project: Project) => {
    clearDetailTimer();
    setViewProject(project);
    setDetailOpen(true);
  };

  // Detail -> Edit: close the detail sheet first, then open the form once its
  // exit animation has run, so the two sheets never animate on top of each other.
  const handleEditFromDetail = (project: Project) => {
    clearDetailTimer();
    setDetailOpen(false);
    detailTimer.current = setTimeout(() => {
      setViewProject(null);
      handleEdit(project);
    }, 220);
  };

  const handleDetailClose = () => {
    clearDetailTimer();
    setDetailOpen(false);
    detailTimer.current = setTimeout(() => setViewProject(null), 220);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditProject(null);
  };

  const tabCounts = {
    pending: pending.length,
    ongoing: ongoing.length,
    completed: completed.length,
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-30"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          // Solid (not glass) so scrolled content can't show through the gaps
          // around the floating header card.
          background: 'var(--background)',
        }}
      >
        <div className="px-3 pt-3">
          <AppHeader
            title="Projects"
            subtitle={`${tabCounts.ongoing} active · ${tabCounts.pending} pending`}
          />
        </div>

        <SearchBar />

        {/* Tabs */}
        <div className="px-4 pb-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList
              className="w-full rounded-2xl p-1 h-11"
              style={{ background: 'var(--muted-bg)' }}
            >
              {(['pending', 'ongoing', 'completed'] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  id={`tab-${tab}`}
                  className="flex-1 rounded-xl text-xs font-semibold capitalize relative data-[state=active]:shadow-sm transition-all"
                  style={{
                    color: activeTab === tab ? 'var(--foreground)' : 'var(--muted)',
                  }}
                >
                  {tab}
                  {tabCounts[tab] > 0 && (
                    <span
                      className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: activeTab === tab ? 'var(--primary)' : 'var(--muted-bg)',
                        color: activeTab === tab ? 'white' : 'var(--muted)',
                      }}
                    >
                      {tabCounts[tab]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pt-3 pb-4">
        {activeTab === 'pending' && (
          <ProjectList
            projects={pending}
            hasLoaded={hasLoaded}
            onView={handleView}
            onEdit={handleEdit}
            emptyMessage="No pending projects. Tap + to add one!"
          />
        )}
        {activeTab === 'ongoing' && (
          <ProjectList
            projects={ongoing}
            hasLoaded={hasLoaded}
            onView={handleView}
            onEdit={handleEdit}
            emptyMessage="No active projects right now."
          />
        )}
        {activeTab === 'completed' && (
          <ProjectList
            projects={completed}
            hasLoaded={hasLoaded}
            onView={handleView}
            onEdit={handleEdit}
            emptyMessage="No completed projects yet. Keep going! 🚀"
          />
        )}
      </div>

      {/* FAB */}
      <motion.button
        className="fab"
        id="add-project-fab"
        onClick={() => { setEditProject(null); setFormOpen(true); }}
        whileTap={{ scale: 0.9 }}
        aria-label="Add new project"
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      {/* Form Sheet */}
      <ProjectDetailSheet
        open={detailOpen}
        onClose={handleDetailClose}
        onEdit={handleEditFromDetail}
        project={viewProject}
      />

      <ProjectFormSheet
        open={formOpen}
        onClose={handleClose}
        project={editProject}
      />
    </div>
  );
}
