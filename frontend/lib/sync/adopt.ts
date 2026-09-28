import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db';
import { isFreshDevice } from '../domain/replica';

// Every device invents its own ids for the catalogue and its own empty list, and queues them for
// backup. If a fresh device pushed those into an account that already has data, the account would
// hold two catalogues and two default lists. So on a device's first sync — no pull cursor yet — a
// fresh device (no sets, no session markers) signing in to an account with data drops its own
// untouched catalogue and list, and their queued rows, and lets the pull bring the account's.
//
// A device that has logged anything is never adopted; an empty account (a friend's first device)
// is never adopted from. A list picked before any set is logged is the one thing given up, by
// design: the account's list wins. No set is ever touched.

export type Adoption = 'adopted' | 'kept' | 'stop';

export async function adoptIfFresh(client: SupabaseClient): Promise<Adoption> {
  if ((await db.sync_state.count()) > 0) return 'kept';
  if (!(await fresh())) return 'kept';

  const { count, error } = await client
    .from('exercises')
    .select('id', { count: 'exact', head: true });
  if (error) return 'stop';
  if (!count) return 'kept';

  return db.transaction(
    'rw',
    [db.exercises, db.templates, db.template_items, db.outbox, db.set_logs, db.sessions],
    async () => {
      // Checked again inside the transaction, so a set logged meanwhile keeps the device's data.
      if (!(await fresh())) return 'kept';
      await Promise.all([
        db.exercises.clear(),
        db.templates.clear(),
        db.template_items.clear(),
        db.outbox.clear(),
      ]);
      return 'adopted';
    },
  );
}

async function fresh(): Promise<boolean> {
  return isFreshDevice({ sets: await db.set_logs.count(), sessions: await db.sessions.count() });
}
