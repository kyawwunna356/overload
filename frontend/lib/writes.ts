import { LOCAL_USER_ID } from './constants';
import { db } from './db';
import type { OutboxRow, SetKind, SetLog } from './domain/types';
import { newId } from './uuid';

// The write path (Hard Rule 5). Every write goes to Dexie first and enqueues an outbox
// row for the sync layer (milestone 5) to push later. Both happen inside ONE transaction,
// so a set can never exist without its outbox row or the reverse — and nothing here ever
// waits on the network.

export type NewSet = {
  exercise_id: string;
  weight: number;
  reps: number;
  kind: SetKind;
};

export async function logSet(input: NewSet): Promise<SetLog> {
  // The write layer stamps the time; the domain layer never reads the clock.
  const now = Date.now();
  const set: SetLog = {
    id: newId(now),
    user_id: LOCAL_USER_ID,
    exercise_id: input.exercise_id,
    // Sessions are derived by the gap rule (milestone 2); nothing assigns one here.
    session_id: null,
    logged_at: now,
    weight: input.weight,
    reps: input.reps,
    rpe: null,
    kind: input.kind,
    updated_at: now,
  };
  await db.transaction('rw', db.set_logs, db.outbox, async () => {
    await db.set_logs.add(set);
    await db.outbox.add(outboxRow('upsert', set, now));
  });
  return set;
}

// Removes a set (e.g. a mistaken tap). The outbox row carries the set as it was, so the
// remote copy can be deleted later. Deleting a set that's already gone does nothing.
export async function deleteSet(id: string): Promise<void> {
  await db.transaction('rw', db.set_logs, db.outbox, async () => {
    const set = await db.set_logs.get(id);
    if (!set) return;
    await db.set_logs.delete(id);
    await db.outbox.add(outboxRow('delete', set, Date.now()));
  });
}

function outboxRow(op: OutboxRow['op'], payload: SetLog, at: number): OutboxRow {
  return { id: newId(at), table: 'set_logs', op, payload, created_at: at };
}
