'use client';

import { useEffect, useRef } from 'react';
import { BottomNav } from './BottomNav';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { useSyncStore } from '@/lib/sync/useSyncStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load projects from IndexedDB on mount (once)
    useProjectStore.getState().loadProjects();

    // Sync sets up its own auth + online listeners and is a no-op when
    // Supabase isn't configured. Deliberately not awaited: the splash is gated
    // on the local read only, never on the network.
    useSyncStore.getState().init();

    if (!('serviceWorker' in navigator)) return;

    // In dev, a cache-first worker serves stale Turbopack chunks and breaks HMR,
    // so never register one — and tear down any worker left over from a previous run.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.warn('SW registration failed:', err));
  }, []); // empty dependency array — runs once

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--background)' }}>
      <main
        className="flex-1 overflow-y-auto"
        style={{
          paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px))',
          // Landscape on a notched device pushes content out from under the
          // notch and the rounded corners.
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* Mobile-first: full-bleed on phones, centred column from `sm` up so the
            UI doesn't stretch across a desktop viewport. */}
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
