import { LOCAL_USER_ID } from './constants';
import { db } from './db';
import { movePick, nextSortOrder } from './domain/list';
import { endMarkerTime, type DerivedSession } from './domain/sessions';
import type {
  OutboxRow,
  Pattern,
  Session,
  SetKind,
  SetLog,
  SyncedRow,
  SyncedTable,
  Template,
  TemplateItem,
} from './domain/types';
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

// Adds an exercise to your list, at the end of its group so it never disturbs an order you set
// (Hard Rule 3: this decides what the board shows, nothing about what can be logged). Adding one
// that's already listed does nothing, so a double tap is one row.
export async function addToList(exerciseId: string, pattern: Pattern): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.templates, db.template_items, db.outbox, async () => {
    const template = await defaultTemplate(now);
    const items = await db.template_items.where('template_id').equals(template.id).toArray();
    if (items.some((item) => item.exercise_id === exerciseId)) return;

    const item: TemplateItem = {
      id: newId(now),
      template_id: template.id,
      exercise_id: exerciseId,
      // A label, copied from the exercise; the board groups by the exercise's own pattern.
      pattern,
      sort_order: nextSortOrder(items),
    };
    await db.template_items.add(item);
    await db.outbox.add(outboxRow('template_items', 'upsert', item, now));
  });
}

// Takes an exercise off your list. Its sets are untouched — history is never a casualty of
// tidying the board, and adding it back brings the history straight with it. Removing one that
// isn't listed does nothing. Remaining positions are left as they are: they only have to be in
// the right order, not dense.
export async function removeFromList(exerciseId: string): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.template_items, db.outbox, async () => {
    const listed = await db.template_items.where('exercise_id').equals(exerciseId).toArray();
    if (listed.length === 0) return;
    await db.template_items.bulkDelete(listed.map((item) => item.id));
    await db.outbox.bulkAdd(listed.map((item) => outboxRow('template_items', 'delete', item, now)));
  });
}

// Moves one exercise a step up or down within its own group, and writes the group back with dense
// positions (0, 1, 2 …). Only this group's rows are rewritten, so the other patterns are untouched.
// Moving at either end, or an exercise that isn't listed, does nothing — the control is always safe
// to tap. Order is the one thing on the board you set by hand, so it's stored, never inferred.
export async function moveInList(exerciseId: string, direction: 'up' | 'down'): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.templates, db.template_items, db.outbox, async () => {
    const template = await db.templates.filter((row) => row.is_default).first();
    if (!template) return;

    const items = await db.template_items.where('template_id').equals(template.id).toArray();
    const moving = items.find((item) => item.exercise_id === exerciseId);
    if (!moving) return;

    // A group is the exercises sharing this one's pattern, in the order you set.
    const group = items
      .filter((item) => item.pattern === moving.pattern)
      .sort((a, b) => a.sort_order - b.sort_order || (a.exercise_id < b.exercise_id ? -1 : 1));
    const moved = movePick(
      group.map((item) => item.exercise_id),
      exerciseId,
      direction,
    );
    if (moved.every((id, i) => id === group[i].exercise_id)) return;

    const byExercise = new Map(group.map((item) => [item.exercise_id, item]));
    const rewritten = moved.flatMap((id, index) => {
      const item = byExercise.get(id);
      return item === undefined || item.sort_order === index ? [] : [{ ...item, sort_order: index }];
    });
    await db.template_items.bulkPut(rewritten);
    await db.outbox.bulkAdd(rewritten.map((item) => outboxRow('template_items', 'upsert', item, now)));
  });
}

// The list's owner. Seeded on first run; created here only if a database somehow has none, so
// adding an exercise can never fail for want of it.
async function defaultTemplate(now: number): Promise<Template> {
  const existing = await db.templates.filter((row) => row.is_default).first();
  if (existing) return existing;

  const template: Template = {
    id: newId(now),
    user_id: LOCAL_USER_ID,
    name: 'My Exercises',
    is_default: true,
    updated_at: now,
  };
  await db.templates.add(template);
  await db.outbox.add(outboxRow('templates', 'upsert', template, now));
  return template;
}

function outboxRow(
  table: SyncedTable,
  op: OutboxRow['op'],
  payload: SyncedRow,
  at: number,
): OutboxRow {
  return { id: newId(at), table, op, payload, created_at: at };
}
