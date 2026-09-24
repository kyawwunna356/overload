import type { Exercise, SetLog } from './types';

// Builds a valid Exercise; the default id follows the name so rows stay distinguishable.
export function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  const base: Exercise = {
    id: '',
    user_id: 'test',
    name: 'Exercise',
    pattern: 'squat',
    default_rest_sec: 120,
    archived: false,
    updated_at: 0,
    ...overrides,
  };
  return { ...base, id: overrides.id ?? `ex-${base.name}` };
}

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

// A copy of a row without some fields, as an older version of the app would have stored it.
export function without<T extends object>(row: T, ...keys: (keyof T)[]): Partial<T> {
  const copy: Partial<T> = { ...row };
  for (const key of keys) delete copy[key];
  return copy;
}
