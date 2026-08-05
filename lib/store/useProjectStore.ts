import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  ProjectStatus,
  FilterState,
  StatusGroup,
  STATUS_GROUP,
  PRIORITY_RANK,
  isActiveStatus,
  emptyProjectRecord,
} from '@/lib/types';
import { db } from '@/lib/db/dexie';
import { ProjectFormData } from '@/lib/validations/project.schema';
import { scheduleSync } from '@/lib/sync/schedule';

interface ProjectStore {
  projects: Project[];
  searchQuery: string;
  filters: FilterState;
  activeTab: StatusGroup;
  isLoading: boolean;
  /**
   * True once the first load from IndexedDB has settled (success or failure).
   * `isLoading` can't express this — it starts false, so "not loading" is true
   * both before and after boot. The splash screen keys off this.
   */
  hasLoaded: boolean;

  // Loaders
  loadProjects: () => Promise<void>;

  // CRUD
  addProject: (data: ProjectFormData) => Promise<Project>;
  updateProject: (id: string, data: Partial<ProjectFormData>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<Project>;
  archiveProject: (id: string) => Promise<void>;
  updateStatus: (id: string, status: ProjectStatus) => Promise<void>;

  // UI state
  setSearchQuery: (q: string) => void;
  setFilters: (f: Partial<FilterState>) => void;
  setActiveTab: (tab: StatusGroup) => void;

  // Computed
  getFilteredProjects: (group: StatusGroup) => Project[];
  getDashboardStats: () => {
    total: number;
    pending: number;
    ongoing: number;
    completed: number;
    avgProgress: number;
    byPriority: Record<string, number>;
    upcomingDeadlines: Project[];
    recentlyUpdated: Project[];
  };
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      searchQuery: '',
      filters: { priority: 'all', type: 'all', sortBy: 'newest' },
      activeTab: 'pending',
      isLoading: false,
      hasLoaded: false,

      loadProjects: async () => {
        set({ isLoading: true });
        try {
          // One scan, then filter out soft-deleted rows in memory. (This used to
          // run a second, entirely unused indexed query first — two full table
          // scans on every cold boot, which delayed the splash for nothing.)
          const all = await db.projects.toArray();
          set({ projects: all.filter((p) => !p.deletedAt) });
        } catch (e) {
          console.error('Failed to load projects', e);
        } finally {
          // hasLoaded in the finally block: a failed read must still release
          // the splash rather than trapping the user behind it.
          set({ isLoading: false, hasLoaded: true });
        }
      },

      addProject: async (data) => {
        const now = new Date().toISOString();
        const project: Project = {
          // Start from a complete blank record, then overlay the form. The form
          // only edits a subset now, so spreading it alone would leave the rest
          // undefined — and the UI reads them unguarded.
          ...emptyProjectRecord(),
          ...data,
          id: uuidv4(),
          // <input type="date"> yields '' when cleared, not null. Normalise so
          // the value round-trips through Supabase unchanged and truthiness
          // checks in the UI behave.
          startDate: data.startDate || null,
          expectedEndDate: data.expectedEndDate || null,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
          deletedAt: null,
        };

        // put, not add: add() throws ConstraintError if the key already exists,
        // which a pull-then-recreate sequence can hit.
        await db.projects.put(project);
        set((state) => ({ projects: [project, ...state.projects] }));
        scheduleSync();
        return project;
      },

      updateProject: async (id, data) => {
        const now = new Date().toISOString();
        await db.projects.update(id, { ...data, updatedAt: now, syncStatus: 'pending' });
        set((state) => ({
          projects: state.projects.map((p) =>
            // syncStatus is mirrored here too: without it the in-memory copy
            // stays 'synced' while Dexie says 'pending', so any sync indicator
            // would lie and handleExport would serialise the wrong value.
            p.id === id ? { ...p, ...data, updatedAt: now, syncStatus: 'pending' } : p
          ),
        }));
        scheduleSync();
      },

      deleteProject: async (id) => {
        const now = new Date().toISOString();
        // syncStatus/updatedAt are stamped by the Dexie hook, which is what
        // lets the delete reach the server as a tombstone.
        await db.projects.update(id, { deletedAt: now });
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
        scheduleSync();
      },

      restoreProject: async (id) => {
        await db.projects.update(id, { deletedAt: null });
        // Re-read so the row reflects whatever the hook stamped on it.
        const restored = await db.projects.get(id);
        if (restored) {
          set((state) => ({ projects: [restored, ...state.projects] }));
        }
        scheduleSync();
      },

      duplicateProject: async (id) => {
        const original = get().projects.find((p) => p.id === id);
        if (!original) throw new Error('Project not found');

        const now = new Date().toISOString();
        const duplicate: Project = {
          ...original,
          id: uuidv4(),
          title: `${original.title} (Copy)`,
          status: 'draft',
          progress: 0,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
          deletedAt: null,
        };

        await db.projects.put(duplicate);
        set((state) => ({ projects: [duplicate, ...state.projects] }));
        scheduleSync();
        return duplicate;
      },

      archiveProject: async (id) => {
        const now = new Date().toISOString();
        await db.projects.update(id, {
          status: 'archived',
          updatedAt: now,
          syncStatus: 'pending',
        });
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status: 'archived', updatedAt: now, syncStatus: 'pending' } : p
          ),
        }));
        scheduleSync();
      },

      updateStatus: async (id, status) => {
        const now = new Date().toISOString();
        await db.projects.update(id, { status, updatedAt: now, syncStatus: 'pending' });
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status, updatedAt: now } : p
          ),
        }));
      },

      setSearchQuery: (q) => set({ searchQuery: q }),
      setFilters: (f) =>
        set((state) => ({ filters: { ...state.filters, ...f } })),
      setActiveTab: (tab) => set({ activeTab: tab }),

      getFilteredProjects: (group) => {
        const { projects, searchQuery, filters } = get();
        // Many statuses fold into each tab. Previously this matched the status
        // to the tab name exactly, so anything outside the three tab names was
        // invisible everywhere with no error.
        let result = projects.filter(
          (p) => STATUS_GROUP[p.status] === group && !p.deletedAt
        );

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          result = result.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.client.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.tags.some((t) => t.toLowerCase().includes(q))
          );
        }

        // Priority filter
        if (filters.priority !== 'all') {
          result = result.filter((p) => p.priority === filters.priority);
        }

        // Type filter
        if (filters.type !== 'all') {
          result = result.filter((p) => p.type === filters.type);
        }

        // Sort
        result = [...result].sort((a, b) => {
          switch (filters.sortBy) {
            case 'oldest':
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'dueDate':
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            case 'priority':
              return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            case 'progress':
              return b.progress - a.progress;
            case 'newest':
            default:
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        });

        return result;
      },

      getDashboardStats: () => {
        const { projects } = get();
        // isActiveStatus excludes archived AND cancelled, so a cancelled
        // project no longer drags the average progress down.
        const active = projects.filter((p) => !p.deletedAt && isActiveStatus(p.status));

        // Counted by tab group, so every status lands somewhere.
        const pending = active.filter((p) => STATUS_GROUP[p.status] === 'pending').length;
        const ongoing = active.filter((p) => STATUS_GROUP[p.status] === 'ongoing').length;
        const completed = active.filter((p) => STATUS_GROUP[p.status] === 'completed').length;
        const total = active.length;
        const avgProgress =
          total > 0 ? Math.round(active.reduce((s, p) => s + p.progress, 0) / total) : 0;

        const byPriority = active.reduce(
          (acc, p) => {
            acc[p.priority] = (acc[p.priority] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingDeadlines = active
          .filter((p) => {
            const end = p.expectedEndDate ?? p.dueDate;
            if (!end || p.status === 'completed') return false;
            const due = new Date(end);
            return due >= now && due <= weekFromNow;
          })
          .sort(
            (a, b) =>
              new Date(a.expectedEndDate ?? a.dueDate!).getTime() -
              new Date(b.expectedEndDate ?? b.dueDate!).getTime()
          );

        const recentlyUpdated = [...active]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);

        return { total, pending, ongoing, completed, avgProgress, byPriority, upcomingDeadlines, recentlyUpdated };
      },
    }),
    {
      name: 'orbit-ui-state',
      partialize: (state) => ({
        activeTab: state.activeTab,
        filters: state.filters,
      }),
    }
  )
);
