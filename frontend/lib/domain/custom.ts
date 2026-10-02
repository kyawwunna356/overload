import type { Exercise } from './types';

// Naming your own exercise. A name is trimmed with inner spaces collapsed, and it has to be new:
// one already in the catalogue (in any case, in any pattern) is refused and names that exercise, so
// a name lives in one category only — two lifts of the same name would split your history — sync's repair merges exercises by name anyway. Only
// exercises in use count; an archived one is out of the way. Pure.

export const CUSTOM_NAME_MAX = 60;

export type CustomName =
  | { kind: 'ok'; name: string }
  | { kind: 'empty' }
  | { kind: 'taken'; exercise: Exercise };

export function customName(input: string, catalogue: readonly Exercise[]): CustomName {
  const name = input.trim().replace(/\s+/g, ' ').slice(0, CUSTOM_NAME_MAX);
  if (name === '') return { kind: 'empty' };
  const key = name.toLowerCase();
  const existing = catalogue.find((exercise) => !exercise.archived && exercise.name.toLowerCase() === key);
  return existing ? { kind: 'taken', exercise: existing } : { kind: 'ok', name };
}
