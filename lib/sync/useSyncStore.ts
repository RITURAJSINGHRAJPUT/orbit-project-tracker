'use client';

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { claimLocalRows, countPending, syncNow } from './engine';

type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncStore {
  session: Session | null;
  /** False until the initial getSession() settles, so the UI can avoid flashing "signed out". */
  authReady: boolean;
  state: SyncState;
  lastSyncedAt: string | null;
  pendingCount: number;
  error: string | null;

  init: () => void;
  sync: (opts?: { silent?: boolean }) => Promise<void>;
  refreshPending: () => Promise<void>;
  signOut: () => Promise<void>;
}

const LAST_SYNCED_KEY = 'orbit-last-synced-at';

let initialized = false;

export const useSyncStore = create<SyncStore>()((set, get) => ({
  session: null,
  authReady: !isSupabaseConfigured, // nothing to wait for when sync is off
  state: 'idle',
  lastSyncedAt: null,
  pendingCount: 0,
  error: null,

  init: () => {
    if (initialized || !supabase) return;
    initialized = true;

    set({ lastSyncedAt: localStorage.getItem(LAST_SYNCED_KEY) });
    void get().refreshPending();

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, authReady: true });
      if (data.session) void get().sync({ silent: true });
    });

    supabase.auth.onAuthStateChange((event, session) => {
      set({ session, authReady: true });
      if (event === 'SIGNED_IN' && session) {
        // Everything created before signing in belongs to this account now.
        void claimLocalRows().then(() => get().sync());
      }
    });

    // Catch up whenever the device comes back online or the app is foregrounded
    // — the two moments where a phone is most likely to have missed changes.
    const onOnline = () => void get().sync({ silent: true });
    const onVisible = () => {
      if (document.visibilityState === 'visible') void get().sync({ silent: true });
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
  },

  sync: async ({ silent = false } = {}) => {
    const { session } = get();
    if (!supabase || !session) return;

    if (!navigator.onLine) {
      set({ state: 'offline' });
      await get().refreshPending();
      return;
    }

    if (!silent) set({ state: 'syncing', error: null });
    try {
      await syncNow(session.user.id);
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, now);
      set({ state: 'idle', lastSyncedAt: now, error: null });
    } catch (err) {
      // A failed sync is never fatal — the data is safe locally and the rows
      // stay marked pending, so the next trigger retries them.
      set({ state: 'error', error: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      await get().refreshPending();
    }
  },

  refreshPending: async () => {
    try {
      set({ pendingCount: await countPending() });
    } catch {
      /* IndexedDB unavailable — not worth surfacing */
    }
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Local projects are deliberately kept: signing out shouldn't destroy data
    // that only exists on this device.
    set({ session: null, lastSyncedAt: null, state: 'idle', error: null });
    localStorage.removeItem(LAST_SYNCED_KEY);
  },
}));
