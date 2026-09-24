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
