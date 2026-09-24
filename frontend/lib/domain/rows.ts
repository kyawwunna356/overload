import { LOCAL_USER_ID } from '../constants';
import {
  PATTERNS,
  SET_KINDS,
  type Exercise,
  type Pattern,
  type Session,
  type SetKind,
  type SetLog,
  type SyncedRow,
  type SyncedTable,
  type Template,
  type TemplateItem,
} from './types';

// Reading a stored row, whatever version of the app wrote it. This is what keeps history
// forward compatible (CLAUDE.md, CONVENTIONS):
//
// - A field added later is filled with its default here, so an old row never has to be
//   rewritten to gain it. When a field is added, its default goes in these readers.
// - An unknown pattern or kind (written by a newer app) falls back to a safe value instead
//   of dropping the row. A set is never lost because this copy of the app is older.
// - Columns this app doesn't know are ignored, and times may be epoch ms (Dexie) or ISO
//   strings (Postgres).
//
// A reader returns null only when the row has no identity (no id, or a set with no exercise
// or time): there is nothing to show. Callers keep the raw row rather than drop it.

export const FALLBACK_PATTERN: Pattern = 'accessory';
export const FALLBACK_KIND: SetKind = 'working';
const DEFAULT_REST_SEC = 120;

type Fields = Record<string, unknown>;

function isFields(raw: unknown): raw is Fields {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function text(f: Fields, key: string): string | undefined {
  const v = f[key];
  return typeof v === 'string' ? v : undefined;
}

function nullableText(f: Fields, key: string): string | null {
  return text(f, key) ?? null;
}

// Postgres `numeric` can arrive as a string, so a numeric string counts.
function num(f: Fields, key: string): number | undefined {
  const v = f[key];
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function bool(f: Fields, key: string): boolean | undefined {
  const v = f[key];
  return typeof v === 'boolean' ? v : undefined;
}

// Epoch ms locally, ISO timestamps remotely.
function time(f: Fields, key: string): number | undefined {
  const v = f[key];
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? undefined : ms;
  }
  return undefined;
}

function pattern(v: unknown): Pattern {
  return PATTERNS.find((p) => p === v) ?? FALLBACK_PATTERN;
}

function kind(v: unknown): SetKind {
  return SET_KINDS.find((k) => k === v) ?? FALLBACK_KIND;
}

export function readExercise(raw: unknown): Exercise | null {
  if (!isFields(raw)) return null;
  const id = text(raw, 'id');
  if (id === undefined) return null;
  return {
    id,
    user_id: text(raw, 'user_id') ?? LOCAL_USER_ID,
    name: text(raw, 'name') ?? '',
    pattern: pattern(raw.pattern),
    default_rest_sec: num(raw, 'default_rest_sec') ?? DEFAULT_REST_SEC,
    archived: bool(raw, 'archived') ?? false,
    updated_at: time(raw, 'updated_at') ?? 0,
  };
}

export function readTemplate(raw: unknown): Template | null {
  if (!isFields(raw)) return null;
  const id = text(raw, 'id');
  if (id === undefined) return null;
  return {
    id,
    user_id: text(raw, 'user_id') ?? LOCAL_USER_ID,
    name: text(raw, 'name') ?? '',
    is_default: bool(raw, 'is_default') ?? false,
    updated_at: time(raw, 'updated_at') ?? 0,
  };
}

// user_id and updated_at were added in Dexie v3; a row from before then reads as yours, and
// as older than any edit (0), so any later write wins over it.
export function readTemplateItem(raw: unknown): TemplateItem | null {
  if (!isFields(raw)) return null;
  const id = text(raw, 'id');
  const templateId = text(raw, 'template_id');
  const exerciseId = text(raw, 'exercise_id');
  if (id === undefined || templateId === undefined || exerciseId === undefined) return null;
  return {
    id,
    user_id: text(raw, 'user_id') ?? LOCAL_USER_ID,
    template_id: templateId,
    exercise_id: exerciseId,
    pattern: pattern(raw.pattern),
    sort_order: num(raw, 'sort_order') ?? 0,
    updated_at: time(raw, 'updated_at') ?? 0,
  };
}

export function readSetLog(raw: unknown): SetLog | null {
  if (!isFields(raw)) return null;
  const id = text(raw, 'id');
  const exerciseId = text(raw, 'exercise_id');
  const loggedAt = time(raw, 'logged_at');
  if (id === undefined || exerciseId === undefined || loggedAt === undefined) return null;
  return {
    id,
    user_id: text(raw, 'user_id') ?? LOCAL_USER_ID,
    exercise_id: exerciseId,
    session_id: nullableText(raw, 'session_id'),
    logged_at: loggedAt,
    weight: num(raw, 'weight') ?? 0,
    reps: num(raw, 'reps') ?? 0,
    rpe: num(raw, 'rpe') ?? null,
    kind: kind(raw.kind),
    updated_at: time(raw, 'updated_at') ?? loggedAt,
  };
}

export function readSession(raw: unknown): Session | null {
  if (!isFields(raw)) return null;
  const id = text(raw, 'id');
  const startedAt = time(raw, 'started_at');
  if (id === undefined || startedAt === undefined) return null;
  return {
    id,
    user_id: text(raw, 'user_id') ?? LOCAL_USER_ID,
    started_at: startedAt,
    ended_at: time(raw, 'ended_at') ?? null,
    template_id: nullableText(raw, 'template_id'),
    updated_at: time(raw, 'updated_at') ?? 0,
  };
}

// One reader per synced table, so a caller holding only a table name can read its rows.
export function readRow(table: SyncedTable, raw: unknown): SyncedRow | null {
  switch (table) {
    case 'exercises':
      return readExercise(raw);
    case 'templates':
      return readTemplate(raw);
    case 'template_items':
      return readTemplateItem(raw);
    case 'set_logs':
      return readSetLog(raw);
    case 'sessions':
      return readSession(raw);
  }
}
