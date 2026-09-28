import { canPush } from '../domain/signin';
import { adoptIfFresh } from './adopt';
import { claimOwner, readOwner } from './owner';
import { pullAll } from './pull';
import { drain } from './push';
import { repairLocal } from './repair';
import { supabase } from './supabase';

// The one way to sync: owner guard → adopt (a fresh device's first sync only) → push → pull →
// repair (merge any duplicated catalogue or default list, then push the merge).
// Fire-and-forget from the triggers; nothing in the UI awaits it (Hard Rule 5).
//
// Push goes first so the server holds every local change before anything comes back, and a
// pull never meets a row that's still waiting to go up (it would skip it anyway).
//
// One sync at a time: within a tab by sharing the running promise, across tabs by a Web Lock
// (a tab that finds it taken skips — the holder is already syncing).

const LOCK = 'overload-sync';

let running: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  running ??= withLock(run).finally(() => {
    running = null;
  });
  return running;
}

async function withLock(work: () => Promise<void>): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.locks) return work();
  await navigator.locks.request(LOCK, { ifAvailable: true }, async (lock) => {
    if (lock) await work();
  });
}

async function run(): Promise<void> {
  const client = supabase();
  if (!client || !navigator.onLine) return;

  const { data } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  // One owner per phone, both ways: a friend signed in here neither receives your history nor
  // pulls theirs into it.
  const owner = readOwner();
  if (!canPush(owner, userId)) return;
  if (owner === null) claimOwner(userId);

  if ((await adoptIfFresh(client)) === 'stop') return;
  if (!(await drain(client, userId))) return;
  if (!(await pullAll(client))) return;
  // Adoption is the fast path; this is the safety net for when it couldn't happen (two devices
  // both used before signing in, or a tab still running older code).
  if (await repairLocal(Date.now())) await drain(client, userId);
}
