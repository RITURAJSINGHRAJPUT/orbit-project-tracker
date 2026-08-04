import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Project, ProjectStatus, FilterState } from '@/lib/types';
import { db } from '@/lib/db/dexie';
import { ProjectFormData } from '@/lib/validations/project.schema';
import { scheduleSync } from '@/lib/sync/schedule';

interface ProjectStore {
  projects: Project[];
  searchQuery: string;
  filters: FilterState;
  activeTab: 'pending' | 'ongoing' | 'completed';
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
  setActiveTab: (tab: 'pending' | 'ongoing' | 'completed') => void;

  // Computed
  getFilteredProjects: (status: 'pending' | 'ongoing' | 'completed') => Project[];
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
          id: uuidv4(),
          title: data.title,
          client: data.client ?? '',
          description: data.description ?? '',
          status: data.status,
          priority: data.priority,
          type: data.type,
          progress: data.progress,
          // <input type="date"> yields '' when cleared, not null. Normalise so
          // the value round-trips through Supabase unchanged (toRow maps '' to
          // null) and truthiness checks in the UI behave.
          startDate: data.startDate || null,
          dueDate: data.dueDate || null,
          createdAt: now,
          updatedAt: now,
          techStack: data.techStack ?? [],
          modules: data.modules ?? [],
          links: data.links ?? {},
          notes: data.notes ?? '',
          tags: data.tags ?? [],
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
          status: 'pending',
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

      getFilteredProjects: (status) => {
        const { projects, searchQuery, filters } = get();
        let result = projects.filter(
          (p) => p.status === status && !p.deletedAt
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
            case 'priority': {
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.priority] - order[b.priority];
            }
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
        const active = projects.filter((p) => !p.deletedAt && p.status !== 'archived');

        const pending = active.filter((p) => p.status === 'pending').length;
        const ongoing = active.filter((p) => p.status === 'ongoing').length;
        const completed = active.filter((p) => p.status === 'completed').length;
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
            if (!p.dueDate || p.status === 'completed') return false;
            const due = new Date(p.dueDate);
            return due >= now && due <= weekFromNow;
          })
          .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

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
