import type { ListItem } from './list';
import { previousSet } from './previous';
import { staleness } from './staleness';
import { PATTERNS, type Exercise, type Pattern, type SetLog } from './types';

export type BoardRow = {
  exercise: Exercise;
  // The last working set — shown inline on the row. Null when there isn't one.
  lastSet: SetLog | null;
  // Days since any set of this exercise; null if it was never performed.
  daysSince: number | null;
};

export type BoardGroup = {
  pattern: Pattern;
  // The exercises you picked for this pattern, in the order you put them in. Empty for a
  // pattern you haven't picked for yet — the group still appears, so it can offer to add.
  rows: BoardRow[];
};

// The board (home screen) as data: one group per movement pattern, in PATTERNS order, each
// holding the exercises in `list` in the order you put them in. Nothing is sorted by how
// recently you trained it, so logging a set never moves a row — the last weight and days-ago
// on each row change in place instead.
//
// All six groups always come back, empty ones included. An entry whose exercise is missing or
// archived is skipped, and the same exercise listed twice appears once.
//
// Pure and derived from `logs` and your list (Hard Rules 1 and 6). Callers with a long history
// should pass just each exercise's newest set and newest working set — the scan below is
// linear in `logs`.
export function buildBoard(
  exercises: readonly Exercise[],
  logs: readonly SetLog[],
  now: number,
  list: readonly ListItem[],
): BoardGroup[] {
  const available = new Map(
    exercises.filter((exercise) => !exercise.archived).map((exercise) => [exercise.id, exercise]),
  );

  const rows: BoardRow[] = [];
  const taken = new Set<string>();
  for (const item of [...list].sort(byPosition)) {
    const exercise = available.get(item.exercise_id);
    if (exercise === undefined || taken.has(exercise.id)) continue;
    taken.add(exercise.id);
    rows.push({
      exercise,
      lastSet: previousSet(exercise.id, logs),
      daysSince: staleness(exercise.id, logs, now),
    });
  }

  // filter() keeps the list order, so each group reads in the order you set.
  return PATTERNS.map((pattern) => ({
    pattern,
    rows: rows.filter((row) => row.exercise.pattern === pattern),
  }));
}

// Your order. Equal positions fall back to the exercise id, so the result never depends on
// the order the rows came out of the database.
function byPosition(a: ListItem, b: ListItem): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.exercise_id < b.exercise_id ? -1 : a.exercise_id > b.exercise_id ? 1 : 0;
}
