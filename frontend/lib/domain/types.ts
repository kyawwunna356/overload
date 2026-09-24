// Plain row types for the data model. Shared by the domain layer and the local
// store — this file must stay free of imports (Hard Rule 6).
//
// Timestamps are epoch milliseconds so elapsed time is plain subtraction
// (Hard Rule 4). The sync layer converts to/from timestamptz at the boundary.
// Weights are kilograms; a weight of 0 means bodyweight.

export const PATTERNS = ['squat', 'hinge', 'push', 'pull', 'accessory', 'core'] as const;
export type Pattern = (typeof PATTERNS)[number];

export const SET_KINDS = ['warmup', 'working', 'drop', 'failure'] as const;
export type SetKind = (typeof SET_KINDS)[number];

export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  pattern: Pattern;
  default_rest_sec: number;
  archived: boolean;
  updated_at: number;
};

export type Template = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  updated_at: number;
};

// A template is a view only: set_logs never reference these rows (Hard Rule 3).
// `user_id` and `updated_at` arrived in Dexie v3 for sync (RLS and last-write-wins); rows
// stored before then are filled in on read by `readTemplateItem`.
export type TemplateItem = {
  id: string;
  user_id: string;
  template_id: string;
  exercise_id: string;
  pattern: Pattern;
  sort_order: number;
  updated_at: number;
};

// The single source of truth (Hard Rule 1). `session_id` is derived by the gap
// rule (milestone 2), so it is null until then.
export type SetLog = {
  id: string;
  user_id: string;
  exercise_id: string;
  session_id: string | null;
  logged_at: number;
  weight: number;
  reps: number;
  rpe: number | null;
  kind: SetKind;
  updated_at: number;
};

// Materialised by the gap rule. `template_id` is a label only, never read to
// validate anything (Hard Rule 3).
export type Session = {
  id: string;
  user_id: string;
  started_at: number;
  ended_at: number | null;
  template_id: string | null;
  updated_at: number;
};

// Rows that sync to Supabase.
export type SyncedRow = Exercise | Template | TemplateItem | SetLog | Session;

export const SYNCED_TABLES = [
  'exercises',
  'templates',
  'template_items',
  'set_logs',
  'sessions',
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

// Local only, never synced. Every write to a synced table enqueues one of
// these after hitting Dexie (Hard Rule 5).
export type OutboxRow = {
  id: string;
  table: SyncedTable;
  op: 'upsert' | 'delete';
  payload: SyncedRow;
  created_at: number;
};
