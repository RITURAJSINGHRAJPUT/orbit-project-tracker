import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/dexie';
import { TimeEntry, EntryStatus } from '@/lib/types';
import { minutesBetween, sumMinutes, toMonthKey } from '@/lib/time';
import type { TimeEntryFormData } from '@/lib/validations/time-entry.schema';
import { scheduleSync } from '@/lib/sync/schedule';

/**
 * Extra Working Hours store.
 *
 * Mirrors useProjectStore deliberately — including a DIFFERENT persist `name`,
 * since reusing 'orbit-ui-state' would have the two stores clobber each other's
 * localStorage key. As there, only UI state is persisted; the records
 * themselves live solely in IndexedDB.
 */

export interface MonthSummary {
  days: number;
  totalMinutes: number;
  averageMinutes: number;
  approvedMinutes: number;
  pendingMinutes: number;
}

interface TimeEntryStore {
  entries: TimeEntry[];
  month: string; // 'YYYY-MM'
  isLoading: boolean;
  hasLoaded: boolean;

  loadEntries: () => Promise<void>;
  addEntry: (data: TimeEntryFormData) => Promise<TimeEntry>;
  updateEntry: (id: string, data: Partial<TimeEntryFormData>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  restoreEntry: (id: string) => Promise<void>;
  setEntryStatus: (id: string, status: EntryStatus) => Promise<void>;

  setMonth: (month: string) => void;

  getMonthEntries: (month?: string) => TimeEntry[];
  getMonthSummary: (month?: string) => MonthSummary;
}

/** Cleared <input type="time"> yields '', not null. */
const orNull = (v: string | null | undefined) => (v ? v : null);

export const useTimeEntryStore = create<TimeEntryStore>()(
  persist(
    (set, get) => ({
      entries: [],
      month: toMonthKey(),
      isLoading: false,
      hasLoaded: false,

      loadEntries: async () => {
        set({ isLoading: true });
        try {
          // One scan, then filter tombstones in memory — an indexed pre-query
          // meant two full table scans per cold boot in the project store.
          const all = await db.timeEntries.toArray();
          set({ entries: all.filter((e) => !e.deletedAt) });
        } catch (e) {
          console.error('Failed to load time entries', e);
        } finally {
          set({ isLoading: false, hasLoaded: true });
        }
      },

      addEntry: async (data) => {
        const now = new Date().toISOString();
        const startTime = orNull(data.startTime);
        const endTime = orNull(data.endTime);

        const entry: TimeEntry = {
          id: uuidv4(),
          date: data.date,
          projectId: orNull(data.projectId),
          workType: data.workType,
          startTime,
          endTime,
          // Computed once on save so lists and totals never recompute per render.
          minutes: minutesBetween(startTime, endTime) ?? 0,
          reason: data.reason ?? '',
          status: data.status,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
          deletedAt: null,
        };

        // put, not add: add() throws ConstraintError on an existing key, which a
        // pull-then-recreate sequence can hit.
        await db.timeEntries.put(entry);
        set((state) => ({ entries: [entry, ...state.entries] }));
        scheduleSync();
        return entry;
      },

      updateEntry: async (id, data) => {
        const now = new Date().toISOString();
        const current = get().entries.find((e) => e.id === id);

        const startTime = 'startTime' in data ? orNull(data.startTime) : (current?.startTime ?? null);
        const endTime = 'endTime' in data ? orNull(data.endTime) : (current?.endTime ?? null);

        const patch: Partial<TimeEntry> = {
          ...data,
          projectId: 'projectId' in data ? orNull(data.projectId) : current?.projectId ?? null,
          startTime,
          endTime,
          minutes: minutesBetween(startTime, endTime) ?? 0,
          updatedAt: now,
          syncStatus: 'pending',
        };

        await db.timeEntries.update(id, patch);
        set((state) => ({
          // Mirror syncStatus into memory too, or the store says 'synced' while
          // Dexie says 'pending' and any indicator lies.
          entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
        scheduleSync();
      },

      deleteEntry: async (id) => {
        // syncStatus/updatedAt are stamped by the Dexie hook — that's what lets
        // the delete reach the server as a tombstone.
        await db.timeEntries.update(id, { deletedAt: new Date().toISOString() });
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
        scheduleSync();
      },

      restoreEntry: async (id) => {
        await db.timeEntries.update(id, { deletedAt: null });
        const restored = await db.timeEntries.get(id);
        if (restored) set((state) => ({ entries: [restored, ...state.entries] }));
        scheduleSync();
      },

      setEntryStatus: async (id, status) => {
        const now = new Date().toISOString();
        await db.timeEntries.update(id, { status, updatedAt: now, syncStatus: 'pending' });
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, status, updatedAt: now, syncStatus: 'pending' } : e
          ),
        }));
        scheduleSync();
      },

      setMonth: (month) => set({ month }),

      getMonthEntries: (month) => {
        const { entries, month: current } = get();
        const key = month ?? current;
        return entries
          .filter((e) => !e.deletedAt && e.date.startsWith(key))
          .sort((a, b) => a.date.localeCompare(b.date));
      },

      getMonthSummary: (month) => {
        const rows = get().getMonthEntries(month);
        const worked = rows.filter((e) => e.minutes > 0);
        const totalMinutes = sumMinutes(worked.map((e) => e.minutes));

        return {
          days: new Set(worked.map((e) => e.date)).size,
          totalMinutes,
          // Per worked DAY, not per entry — two entries on one day is still one day.
          averageMinutes: worked.length
            ? Math.round(totalMinutes / new Set(worked.map((e) => e.date)).size)
            : 0,
          approvedMinutes: sumMinutes(
            worked.filter((e) => e.status === 'approved').map((e) => e.minutes)
          ),
          pendingMinutes: sumMinutes(
            worked.filter((e) => e.status === 'pending').map((e) => e.minutes)
          ),
        };
      },
    }),
    {
      // MUST differ from the project store's key, or they overwrite each other.
      name: 'orbit-time-ui-state',
      partialize: (state) => ({ month: state.month }),
    }
  )
);
