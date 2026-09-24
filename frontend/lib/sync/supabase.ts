import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The one Supabase client. Only `lib/sync/` may import it: the UI never talks to the network
// (Hard Rule 5), it reads Dexie and the sync layer moves rows in the background.
//
// Null when the project isn't configured (no env vars), so the app works exactly as before
// with no backend at all — sync is an addition, never a requirement.

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Sign-in is an emailed code typed into the app, never a link back into it.
      detectSessionInUrl: false,
    },
  });
  return client;
}
