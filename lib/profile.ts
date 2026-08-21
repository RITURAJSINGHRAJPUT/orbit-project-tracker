'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Profile {
  name: string;
  org: string;
}

/**
 * Rendered on the server and during the first client paint, and restored by
 * "Reset to default" in Settings.
 */
export const DEFAULT_PROFILE: Profile = {
  name: 'Rituraj Singh',
  org: 'Bookends Hospitality',
};

interface ProfileState {
  profile: Profile;
  setProfile: (patch: Partial<Profile>) => void;
  resetProfile: () => void;
}

/**
 * Who the sheets and the printed report are for.
 *
 * localStorage rather than IndexedDB + a sync task: it's two strings with no
 * history, no tombstone and no conflict story worth writing, and a third synced
 * table would need its own migration, RLS policy and watermark namespace. The
 * cost is that it stays on this device — signing in elsewhere shows the default
 * until it's set there too.
 *
 * Read it through `useProfile()`, never `useProfileStore` directly, or the
 * component will mismatch on hydration — see below.
 */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      // A patch, not a whole object: callers that only touch `name` can't
      // silently blank out `org`.
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      resetProfile: () => set({ profile: DEFAULT_PROFILE }),
    }),
    { name: 'orbit-profile', version: 1 }
  )
);

// Module-level so the references stay stable across renders — a fresh closure
// each render would make useSyncExternalStore re-subscribe every time.
const subscribeToHydration = (onChange: () => void) =>
  useProfileStore.persist.onFinishHydration(onChange);
const hasHydrated = () => useProfileStore.persist.hasHydrated();
const neverOnServer = () => false;

/**
 * The live profile, safe to render.
 *
 * The hydration gate is load-bearing. `persist` reads localStorage when the
 * store module is first evaluated — before React renders — so a stored name is
 * already in place on the very first client render, while the server HTML still
 * says `DEFAULT_PROFILE`. Rendering it directly is a hydration mismatch.
 *
 * `useSyncExternalStore` is the fix rather than a mounted flag: it is told
 * explicitly that the server snapshot is "not hydrated", so React renders the
 * default during hydration and swaps to the stored value immediately after,
 * without a setState-in-effect cascade.
 */
export function useProfile(): Profile {
  const profile = useProfileStore((s) => s.profile);
  const hydrated = useSyncExternalStore(subscribeToHydration, hasHydrated, neverOnServer);

  return hydrated ? profile : DEFAULT_PROFILE;
}

/**
 * Initials for the avatar fallback. The name is a required argument on purpose:
 * defaulting it to a module-level constant is how this silently went on showing
 * a stale name everywhere the profile became editable.
 */
export const profileInitials = (name: string) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

  // An all-whitespace name would otherwise render an empty circle.
  return initials || '?';
};
