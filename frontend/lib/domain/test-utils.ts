import type { SetLog } from './types';

// Builds a valid SetLog so a test only states the fields it cares about.
// Deterministic: the default id is derived from the fields, and nothing reads the clock.
export function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  const base: SetLog = {
    id: '',
    user_id: 'test',
    exercise_id: 'ex-1',
    session_id: null,
    logged_at: 1_000_000,
    weight: 60,
    reps: 5,
    rpe: null,
    kind: 'working',
    updated_at: 0,
    ...overrides,
  };
  return {
    ...base,
    id: overrides.id ?? `set-${base.exercise_id}-${base.logged_at}-${base.kind}`,
    updated_at: overrides.updated_at ?? base.logged_at,
  };
}
