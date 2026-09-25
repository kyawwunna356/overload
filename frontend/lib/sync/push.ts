import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db';
import { pushBatches, type PushBatch } from '../domain/replica';
import { canPush } from '../domain/signin';
import { claimOwner, readOwner } from './owner';
import { supabase } from './supabase';

// Drains the outbox to Supabase. Fire-and-forget: nothing in the UI awaits it (Hard Rule 5), and
// a push that fails just leaves the rows queued for the next try.
//
// - Rows go up in write order, a batch per run of one table and op (`pushBatches`).
// - A row leaves the outbox only once Supabase has accepted it, so a push cut off halfway just
//   re-sends the rest. Upserts are idempotent and the server ignores stale writes.
// - A batch the server rejects is retried one row at a time; a row it still rejects stays queued
//   and never blocks the rows behind it.
// - One flush at a time: within a tab by sharing the running promise, across tabs by a Web Lock
//   (a tab that finds it taken skips — the holder is already draining).

const MAX_ROWS = 200;
const LOCK = 'overload-outbox';

type Sent = 'ok' | 'rejected' | 'stop';

let running: Promise<void> | null = null;

export function flushOutbox(): Promise<void> {
  running ??= withLock(drain).finally(() => {
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

async function drain(): Promise<void> {
  const client = supabase();
  if (!client || !navigator.onLine) return;

  const { data } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  const owner = readOwner();
  if (!canPush(owner, userId)) return;

  const outbox = await db.outbox.toArray();
  if (outbox.length === 0) return;
  if (owner === null) claimOwner(userId);

  for (const batch of pushBatches(outbox, userId, MAX_ROWS).batches) {
    const sent = await send(client, batch);
    if (sent === 'stop') return;
    if (sent === 'ok') {
      await clear(batch);
      continue;
    }
    for (const item of batch.items) {
      const single: PushBatch = { ...batch, items: [item] };
      const one = await send(client, single);
      if (one === 'stop') return;
      if (one === 'ok') await clear(single);
    }
  }
}

async function send(client: SupabaseClient, batch: PushBatch): Promise<Sent> {
  const table = client.from(batch.table);
  const { error, status } =
    batch.op === 'upsert'
      ? await table.upsert(
          batch.items.flatMap((item) => (item.row ? [item.row] : [])),
          { onConflict: 'id' },
        )
      : await table.delete().in(
          'id',
          batch.items.map((item) => item.id),
        );
  if (!error) return 'ok';
  // No response (offline), an expired session, or a server fault: nothing is wrong with the rows,
  // so stop and try again later. Anything else is the server refusing these rows.
  return status === 0 || status === 401 || status >= 500 ? 'stop' : 'rejected';
}

function clear(batch: PushBatch): Promise<void> {
  return db.outbox.bulkDelete(batch.items.flatMap((item) => item.outboxIds));
}
