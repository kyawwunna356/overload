import { LOCAL_USER_ID } from './constants';
import { db } from './db';
import { endMarkerTime, type DerivedSession } from './domain/sessions';
import type { OutboxRow, Session, SetKind, SetLog, SyncedRow, SyncedTable } from './domain/types';
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
    await db.outbox.add(outboxRow('set_logs', 'upsert', set, now));
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
    await db.outbox.add(outboxRow('set_logs', 'delete', set, Date.now()));
  });
}

// Finishes a session by writing an end marker (Hard Rule 2). The summary's End session button only
// opens the Resume / Finish choice; this runs when you choose Finish, and it's final — nothing
// deletes a marker. It's never required: an idle gap closes a forgotten session on its own. The
// marker is the one stored session fact; the session itself stays derived from its sets. Ending a
// session that's already ended does nothing (returns null), so a double tap writes one row: the
// second transaction runs after the first and finds its marker.
export async function endSession(
  session: Pick<DerivedSession, 'started_at' | 'last_set_at'>,
): Promise<Session | null> {
  const now = Date.now();
  return db.transaction('rw', db.sessions, db.outbox, async () => {
    const markers = (await db.sessions.toArray()).flatMap((row) =>
      row.ended_at === null ? [] : [row.ended_at],
    );
    const endedAt = endMarkerTime(session, markers, now);
    if (endedAt === null) return null;

    const marker: Session = {
      id: newId(now),
      user_id: LOCAL_USER_ID,
      // Informational: when the session began. template_id is a label and is never read.
      started_at: session.started_at,
      ended_at: endedAt,
      template_id: null,
      updated_at: now,
    };
    await db.sessions.add(marker);
    await db.outbox.add(outboxRow('sessions', 'upsert', marker, now));
    return marker;
  });
}

function outboxRow(
  table: SyncedTable,
  op: OutboxRow['op'],
  payload: SyncedRow,
  at: number,
): OutboxRow {
  return { id: newId(at), table, op, payload, created_at: at };
}
