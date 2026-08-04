'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectList } from '@/components/projects/ProjectList';
import { SearchBar } from '@/components/projects/SearchBar';
import { ProjectFormSheet } from '@/components/projects/ProjectFormSheet';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { Project } from '@/lib/types';

export default function ProjectsPage() {
  const { getFilteredProjects, isLoading, activeTab, setActiveTab } = useProjectStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const pending = getFilteredProjects('pending');
  const ongoing = getFilteredProjects('ongoing');
  const completed = getFilteredProjects('completed');

  const handleEdit = (project: Project) => {
    setEditProject(project);
    setFormOpen(true);
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
            isLoading={isLoading}
            onEdit={handleEdit}
            emptyMessage="No pending projects. Tap + to add one!"
          />
        )}
        {activeTab === 'ongoing' && (
          <ProjectList
            projects={ongoing}
            isLoading={isLoading}
            onEdit={handleEdit}
            emptyMessage="No active projects right now."
          />
        )}
        {activeTab === 'completed' && (
          <ProjectList
            projects={completed}
            isLoading={isLoading}
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
      <ProjectFormSheet
        open={formOpen}
        onClose={handleClose}
        project={editProject}
      />
    </div>
  );
}
