import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import { normalizeCode, normalizeEmail } from '../domain/signin';
import { flushOutbox } from './push';
import { isConfigured, supabase } from './supabase';

// Signing in: Continue with Google, or an emailed code as the fallback. This is the one place
// the UI waits on the network (Hard Rule 5's written exception): it's the /account screen, used
// once per device, never the logging path. Every call returns a result instead of throwing, so
// the screen can say what happened in plain words.

export type Account = { userId: string; label: string };

export type AuthResult = { ok: true } | { ok: false; reason: 'offline' | 'rejected' | 'unconfigured' };

const OFFLINE: AuthResult = { ok: false, reason: 'offline' };
const REJECTED: AuthResult = { ok: false, reason: 'rejected' };
const UNCONFIGURED: AuthResult = { ok: false, reason: 'unconfigured' };

function accountOf(session: Session | null): Account | null {
  if (!session) return null;
  const { user } = session;
  const meta: Record<string, unknown> = user.user_metadata ?? {};
  const name = typeof meta.full_name === 'string' ? meta.full_name : undefined;
  return { userId: user.id, label: name ?? user.email ?? 'Signed in' };
}

function failure(error: unknown): AuthResult {
  return isAuthRetryableFetchError(error) || !navigator.onLine ? OFFLINE : REJECTED;
}

function signedIn(): AuthResult {
  void flushOutbox();
  return { ok: true };
}

export function syncConfigured(): boolean {
  return isConfigured();
}

// Leaves the page for Google, which comes back to /account?code=… on this same origin.
export async function signInWithGoogle(): Promise<AuthResult> {
  const client = supabase();
  if (!client) return UNCONFIGURED;
  if (!navigator.onLine) return OFFLINE;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/account` },
  });
  return error ? failure(error) : { ok: true };
}

export async function finishGoogleSignIn(code: string): Promise<AuthResult> {
  const client = supabase();
  if (!client) return UNCONFIGURED;
  const { error } = await client.auth.exchangeCodeForSession(code);
  return error ? failure(error) : signedIn();
}

export async function sendCode(email: string): Promise<AuthResult> {
  const client = supabase();
  if (!client) return UNCONFIGURED;
  if (!navigator.onLine) return OFFLINE;
  const { error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true },
  });
  return error ? failure(error) : { ok: true };
}

export async function verifyCode(email: string, code: string): Promise<AuthResult> {
  const client = supabase();
  if (!client) return UNCONFIGURED;
  if (!navigator.onLine) return OFFLINE;
  const { error } = await client.auth.verifyOtp({
    email: normalizeEmail(email),
    token: normalizeCode(code),
    type: 'email',
  });
  return error ? failure(error) : signedIn();
}

// Local only, so it works with no signal. Every set stays on the phone and in the outbox.
export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut({ scope: 'local' });
}

// Calls back with the current account (null when signed out) straight away, then on every
// change. Returns the unsubscribe. Without a configured project it reports signed out once.
export function onAuthChange(callback: (account: Account | null) => void): () => void {
  const client = supabase();
  if (!client) {
    callback(null);
    return () => {};
  }
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(accountOf(session));
  });
  return () => data.subscription.unsubscribe();
}
