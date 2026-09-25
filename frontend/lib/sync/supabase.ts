import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The one Supabase client. Only `lib/sync/` may import it: the UI never talks to the network
// (Hard Rule 5), it reads Dexie and the sync layer moves rows in the background.
//
// Null when the project isn't configured (no env vars), so the app works exactly as before
// with no backend at all — sync is an addition, never a requirement.

let client: SupabaseClient | null = null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Whether a project is configured, without creating a client (safe while prerendering).
export function isConfigured(): boolean {
  return Boolean(url && key);
}

export function supabase(): SupabaseClient | null {
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Google comes back to /account with a one-time `?code`, which the page exchanges itself
      // (`finishGoogleSignIn`); PKCE keeps that code useless to anyone but this browser.
      flowType: 'pkce',
      detectSessionInUrl: false,
    },
  });
  return client;
}
