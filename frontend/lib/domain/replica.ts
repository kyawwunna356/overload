import { LOCAL_USER_ID } from '../constants';
import {
  readExercise,
  readRow,
  readSession,
  readSetLog,
  readTemplate,
  readTemplateItem,
} from './rows';
import type {
  Exercise,
  OutboxRow,
  Session,
  SetLog,
  SyncedRow,
  SyncedTable,
  Template,
  TemplateItem,
} from './types';

// The pure half of sync: how a row looks on each side, which copy wins, and which local rows
// still need queueing. No network and no Dexie here (Hard Rule 6); `lib/sync/` does the I/O.
//
// Locally, times are epoch ms and every row's user_id is `local`. Remotely, times are ISO
// timestamps (timestamptz) and user_id is the signed-in account, which RLS checks.

export type RemoteValue = string | number | boolean | null;
export type RemoteRow = Record<string, RemoteValue>;

const iso = (ms: number): string => new Date(ms).toISOString();

// Each writer lists exactly the columns this app knows. A column a newer app added is never
// sent, and an upsert only updates the columns it is sent, so an older app can't blank it.
function remoteExercise(row: Exercise, userId: string): RemoteRow {
  return {
    id: row.id,
    user_id: userId,
    name: row.name,
    pattern: row.pattern,
    default_rest_sec: row.default_rest_sec,
    archived: row.archived,
    updated_at: iso(row.updated_at),
  };
}

function remoteTemplate(row: Template, userId: string): RemoteRow {
  return {
    id: row.id,
    user_id: userId,
    name: row.name,
    is_default: row.is_default,
    updated_at: iso(row.updated_at),
  };
}

function remoteTemplateItem(row: TemplateItem, userId: string): RemoteRow {
  return {
    id: row.id,
    user_id: userId,
    template_id: row.template_id,
    exercise_id: row.exercise_id,
    pattern: row.pattern,
    sort_order: row.sort_order,
    updated_at: iso(row.updated_at),
  };
}

function remoteSetLog(row: SetLog, userId: string): RemoteRow {
  return {
    id: row.id,
    user_id: userId,
    exercise_id: row.exercise_id,
    session_id: row.session_id,
    logged_at: iso(row.logged_at),
    weight: row.weight,
    reps: row.reps,
    rpe: row.rpe,
    kind: row.kind,
    updated_at: iso(row.updated_at),
  };
}

function remoteSession(row: Session, userId: string): RemoteRow {
  return {
    id: row.id,
    user_id: userId,
    started_at: iso(row.started_at),
    ended_at: row.ended_at === null ? null : iso(row.ended_at),
    template_id: row.template_id,
    updated_at: iso(row.updated_at),
  };
}

function orNull<T>(row: T | null, write: (row: T) => RemoteRow): RemoteRow | null {
  return row === null ? null : write(row);
}

// A local row (typically an outbox payload, which may predate a field) as the remote table
// stores it. Read through the table's reader first, so an old payload gets its defaults.
export function toRemote(table: SyncedTable, payload: unknown, userId: string): RemoteRow | null {
  switch (table) {
    case 'exercises':
      return orNull(readExercise(payload), (row) => remoteExercise(row, userId));
    case 'templates':
      return orNull(readTemplate(payload), (row) => remoteTemplate(row, userId));
    case 'template_items':
      return orNull(readTemplateItem(payload), (row) => remoteTemplateItem(row, userId));
    case 'set_logs':
      return orNull(readSetLog(payload), (row) => remoteSetLog(row, userId));
    case 'sessions':
      return orNull(readSession(payload), (row) => remoteSession(row, userId));
  }
}

// A remote row as Dexie stores it: unknown columns ignored, unknown values given a fallback,
// and owned by the local user. Null only for a row with no identity.
export function toLocal(
  table: SyncedTable,
  raw: unknown,
  localUserId: string = LOCAL_USER_ID,
): SyncedRow | null {
  const row = readRow(table, raw);
  return row === null ? null : { ...row, user_id: localUserId };
}

// Last write wins on updated_at. A tie keeps the local copy, so re-reading a row you already
// have never rewrites it.
export function newerWins(
  local: { updated_at: number } | undefined,
  incoming: { updated_at: number },
): boolean {
  return local === undefined || incoming.updated_at > local.updated_at;
}

function upsertedIds(table: SyncedTable, outbox: readonly OutboxRow[]): Set<string> {
  return new Set(
    outbox.filter((row) => row.table === table && row.op === 'upsert').map((row) => row.payload.id),
  );
}

// The fake training the seed wrote (Ticket 1). Every set you logged got an outbox upsert in the
// same transaction, and the seed never wrote one, so a set with no upsert is a seeded one. Only
// valid while the outbox has never been flushed: the Dexie v3 upgrade, before any push exists.
export function seededSetIds(setLogs: readonly SetLog[], outbox: readonly OutboxRow[]): string[] {
  const logged = upsertedIds('set_logs', outbox);
  return setLogs.filter((set) => !logged.has(set.id)).map((set) => set.id);
}

// One request's worth of the outbox: a run of the same table and op, in write order. `items` is
// one per row id, carrying every outbox row it clears — two queued edits of the same list item
// go up as one row (Postgres refuses to upsert the same id twice in one statement), and both
// outbox rows leave once it's accepted.
export type PushItem = { id: string; outboxIds: string[]; row: RemoteRow | null };
export type PushBatch = { table: SyncedTable; op: OutboxRow['op']; items: PushItem[] };

// Turns the outbox into requests, oldest first. Runs are never reordered, so a row deleted after
// it was written is deleted after it was written. An upsert whose payload can't be read is left
// out and reported, never dropped: it stays in the outbox.
export function pushBatches(
  outbox: readonly OutboxRow[],
  userId: string,
  maxRows: number,
): { batches: PushBatch[]; unreadable: string[] } {
  const ordered = [...outbox].sort(
    (a, b) => a.created_at - b.created_at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const batches: PushBatch[] = [];
  const unreadable: string[] = [];

  for (const entry of ordered) {
    const row = entry.op === 'upsert' ? toRemote(entry.table, entry.payload, userId) : null;
    const id = row === null ? entry.payload.id : row.id;
    if ((entry.op === 'upsert' && row === null) || typeof id !== 'string') {
      unreadable.push(entry.id);
      continue;
    }

    const last = batches.at(-1);
    const current =
      last && last.table === entry.table && last.op === entry.op ? last : undefined;
    const existing = current?.items.find((item) => item.id === id);
    if (existing) {
      // The later write wins within a batch, as it would on the server.
      existing.outboxIds.push(entry.id);
      existing.row = row;
    } else if (current && current.items.length < maxRows) {
      current.items.push({ id, outboxIds: [entry.id], row });
    } else {
      batches.push({ table: entry.table, op: entry.op, items: [{ id, outboxIds: [entry.id], row }] });
    }
  }
  return { batches, unreadable };
}

// Rows that have never been queued for a push: the catalogue and list, which were written
// before anything synced. Queueing them makes the outbox the one path to the server.
export function unqueuedRows<T extends { id: string }>(
  table: SyncedTable,
  rows: readonly T[],
  outbox: readonly OutboxRow[],
): T[] {
  const queued = upsertedIds(table, outbox);
  return rows.filter((row) => !queued.has(row.id));
}
