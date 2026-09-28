import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db';
import { pushBatches, type PushBatch } from '../domain/replica';

// Drains the outbox to Supabase, as the push step of `syncNow` (which holds the lock and checks
// the account). A push that fails just leaves the rows queued for the next sync.
//
// - Rows go up in write order, a batch per run of one table and op (`pushBatches`).
// - A row leaves the outbox only once Supabase has accepted it, so a push cut off halfway just
//   re-sends the rest. Upserts are idempotent and the server ignores stale writes.
// - A batch the server rejects is retried one row at a time; a row it still rejects stays queued
//   and never blocks the rows behind it.

const MAX_ROWS = 200;

type Sent = 'ok' | 'rejected' | 'stop';

// False when it had to stop (offline, an expired session, a server fault), so the caller doesn't
// go on to pull.
export async function drain(client: SupabaseClient, userId: string): Promise<boolean> {
  const outbox = await db.outbox.toArray();

  for (const batch of pushBatches(outbox, userId, MAX_ROWS).batches) {
    const sent = await send(client, batch);
    if (sent === 'stop') return false;
    if (sent === 'ok') {
      await clear(batch);
      continue;
    }
    for (const item of batch.items) {
      const single: PushBatch = { ...batch, items: [item] };
      const one = await send(client, single);
      if (one === 'stop') return false;
      if (one === 'ok') await clear(single);
    }
  }
  return true;
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
