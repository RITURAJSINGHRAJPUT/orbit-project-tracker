'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrbitLogo } from '@/components/brand/OrbitLogo';
import { supabase } from '@/lib/supabase/client';

/**
 * Landing page for the emailed magic link.
 *
 * The client is configured with `detectSessionInUrl`, so supabase-js has
 * already consumed the tokens from the URL fragment by the time this mounts.
 * All that's left is to confirm a session exists and move on.
 *
 * Note this reads nothing from `useSearchParams` — that hook would force a
 * <Suspense> boundary on an otherwise statically prerendered route, and the
 * implicit flow puts its payload in the fragment (never sent to the server)
 * rather than the query string anyway.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Captured locally so the narrowing survives into the nested closures.
    const client = supabase;
    if (!client) {
      router.replace('/projects');
      return;
    }

    let cancelled = false;

    const settle = async () => {
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        router.replace('/projects');
      } else {
        // Give detectSessionInUrl a beat, then give up rather than hang.
        setTimeout(async () => {
          if (cancelled) return;
          const retry = await client.auth.getSession();
          if (retry.data.session) router.replace('/projects');
          else setFailed(true);
        }, 1500);
      }
    };

    void settle();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-8 text-center">
      <OrbitLogo className="h-16 w-16" surface="var(--background)" />
      {failed ? (
        <>
          <p className="font-semibold" style={{ color: 'var(--foreground)' }}>
            That link didn&apos;t sign you in
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Links can expire or open in a different browser. Open Settings and use the 6-digit code
            instead — it always works.
          </p>
          <button
            onClick={() => router.replace('/settings')}
            className="mt-1 rounded-2xl px-5 py-3 text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white' }}
          >
            Go to Settings
          </button>
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Signing you in…
        </p>
      )}
    </div>
  );
}
