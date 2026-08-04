import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Placeholder values (`your_supabase_project_url`) are truthy, so a bare
 * truthiness check would report "configured" and hand back a client pointed at
 * a host that doesn't exist.
 *
 * The URL has to look like a real project. The key is only checked for being
 * non-placeholder and plausibly long — deliberately format-agnostic, since
 * Supabase issues both legacy anon JWTs (`eyJ…`) and newer publishable keys
 * (`sb_publishable_…`), and a stricter test would reject a valid one.
 */
const isPlaceholder = (v: string) => /^your[_-]/i.test(v.trim());

const looksReal =
  /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(supabaseUrl.trim()) &&
  !isPlaceholder(supabaseUrl) &&
  !isPlaceholder(supabaseAnonKey) &&
  supabaseAnonKey.trim().length >= 20;

/**
 * Null when Supabase isn't configured. The whole app works without it — sync is
 * additive, never a gate — so every call site guards on `supabase` being null.
 */
export const supabase = looksReal
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Deliberately the default `implicit` flow rather than `pkce`.
        //
        // PKCE stores a code_verifier in the localStorage of the browser that
        // STARTED the sign-in. On a phone the magic link is tapped in an email
        // app, which often opens a different browser context than the installed
        // app — the verifier isn't there and the exchange fails. Implicit
        // returns tokens in the URL fragment with no such coupling, so the link
        // works cross-context. (The 6-digit OTP path doesn't redirect at all,
        // so it's unaffected either way.)
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = looksReal;
