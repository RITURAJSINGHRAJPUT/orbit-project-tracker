'use client';

import { useEffect, useState } from 'react';
import { OrbitLogo } from '@/components/brand/OrbitLogo';
import { useProjectStore } from '@/lib/store/useProjectStore';

/** Long enough that a fast IndexedDB read doesn't produce a jarring flash. */
const MIN_VISIBLE_MS = 700;
/** Hard cap — a hung database must never trap the user behind the splash. */
const MAX_VISIBLE_MS = 3000;
const FADE_MS = 320;

/**
 * Module-scoped, so a Fast Refresh or an error-boundary remount of AppShell
 * can't replay the splash. On the server this is always false and the effect
 * never runs, so the SSR markup and the first client render agree — no
 * hydration mismatch, and no `typeof window` guard needed.
 */
let dismissed = false;

/**
 * Branded boot screen, shown once per document load while projects come out of
 * IndexedDB. Rendered as a fixed overlay *beside* the app (never wrapping it),
 * so if anything in here throws or stalls the app underneath is still live.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(!dismissed);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const reduceMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = reduceMotion ? 0 : FADE_MS;
    const startedAt = Date.now();

    let finished = false;
    let fadeTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const finish = () => {
      if (finished) return;
      finished = true;
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      fadeTimer = setTimeout(() => {
        setLeaving(true);
        hideTimer = setTimeout(() => {
          dismissed = true;
          setVisible(false);
        }, fade);
      }, remaining);
    };

    // Already loaded (e.g. a remount) — dismiss without waiting on the store.
    if (useProjectStore.getState().hasLoaded) finish();

    const unsubscribe = useProjectStore.subscribe((state) => {
      if (state.hasLoaded) finish();
    });
    const cap = setTimeout(finish, MAX_VISIBLE_MS);

    return () => {
      unsubscribe();
      clearTimeout(cap);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`orbit-splash${leaving ? ' orbit-splash--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Orbit"
    >
      {/* surface must match the splash background, not the default card colour,
          or the mark's node dots render as grey discs. */}
      <OrbitLogo className="orbit-splash__mark h-20 w-20" surface="var(--background)" />
      <p className="orbit-splash__wordmark">ORBIT</p>
    </div>
  );
}
