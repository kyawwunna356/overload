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
  rows: BoardRow[];
};

// The board (home screen) as data: one group per movement pattern, in PATTERNS order,
// each sorted most recently performed first. Exercises never performed sink to the
// bottom of their group. Archived exercises don't appear and empty groups are dropped.
//
// Pure and derived entirely from `logs` (Hard Rule 1). Callers with a long history
// should pass just each exercise's newest set and newest working set — the scan below
// is linear in `logs`.
export function buildBoard(
  exercises: readonly Exercise[],
  logs: readonly SetLog[],
  now: number,
): BoardGroup[] {
  const rows: BoardRow[] = exercises
    .filter((exercise) => !exercise.archived)
    .map((exercise) => ({
      exercise,
      lastSet: previousSet(exercise.id, logs),
      daysSince: staleness(exercise.id, logs, now),
    }));

  return PATTERNS.map((pattern) => ({
    pattern,
    rows: rows.filter((row) => row.exercise.pattern === pattern).sort(byRecency),
  })).filter((group) => group.rows.length > 0);
}

// Fewest days since performed first; never-performed last. Exact ties fall back to
// name, then id, so the order never depends on input order.
function byRecency(a: BoardRow, b: BoardRow): number {
  if (a.daysSince !== b.daysSince) {
    if (a.daysSince === null) return 1;
    if (b.daysSince === null) return -1;
    return a.daysSince - b.daysSince;
  }
  return compareText(a.exercise.name, b.exercise.name) || compareText(a.exercise.id, b.exercise.id);
}

// Plain code-unit comparison: deterministic, unlike locale-aware collation.
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
