import { previousSet } from './previous';
import { e1rm } from './prs';
import { staleness } from './staleness';
import type { Exercise, SetLog } from './types';

// History's Exercises view and each lift's page: which lifts you've done, and the best you've done
// at each. Facts about the past only — no trend, no chart, nothing to beat. Derived from the sets
// every time (Hard Rule 1). Pure: `now` is passed in (Hard Rule 6).

export type ExerciseIndexRow = {
  exercise: Exercise;
  // The last working set, or null when only warmups (or other kinds) were ever logged.
  set: SetLog | null;
  // Days since any set of it, fractional; the caller rounds for display.
  daysAgo: number;
};

// Every lift with at least one set, A to Z, narrowed to names containing `query` (any case, spaces
// around it ignored). An archived lift is still here: the sets happened. `latest` only needs each
// exercise's newest set and newest working set; more is fine.
export function exerciseIndex(
  exercises: readonly Exercise[],
  latest: readonly SetLog[],
  now: number,
  query = '',
): ExerciseIndexRow[] {
  const needle = query.trim().toLowerCase();
  return exercises
    .filter((exercise) => needle === '' || exercise.name.toLowerCase().includes(needle))
    .flatMap((exercise) => {
      const daysAgo = staleness(exercise.id, latest, now);
      return daysAgo === null ? [] : [{ exercise, set: previousSet(exercise.id, latest), daysAgo }];
    })
    .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name, 'en', { sensitivity: 'base' }));
}

export type Best = {
  set: SetLog;
  // In the record's own unit: kg for heaviest and e1RM, reps for most reps.
  value: number;
};

export type ExerciseRecords = {
  // The heaviest working set; at the same weight, the one with more reps.
  heaviest: Best | null;
  // The best Epley estimate. Null for a bodyweight lift, where it means nothing.
  bestE1rm: Best | null;
  // The most reps in one working set; at the same reps, the heavier one.
  mostReps: Best | null;
};

// A lift's standing bests, for the records card. Working sets only, as everywhere records are
// judged (prs.ts). A tie keeps the earlier set, so the date shown is when you first did it.
// `history` may be unsorted and may hold other exercises' sets only if the caller filtered them.
export function exerciseRecords(history: readonly SetLog[]): ExerciseRecords {
  const working = history.filter((set) => set.kind === 'working').sort(oldestFirst);
  let heaviest: SetLog | null = null;
  let bestE1rm: SetLog | null = null;
  let mostReps: SetLog | null = null;

  for (const set of working) {
    if (heaviest === null || set.weight > heaviest.weight || (set.weight === heaviest.weight && set.reps > heaviest.reps)) {
      heaviest = set;
    }
    if (e1rm(set) > 0 && (bestE1rm === null || e1rm(set) > e1rm(bestE1rm))) bestE1rm = set;
    if (mostReps === null || set.reps > mostReps.reps || (set.reps === mostReps.reps && set.weight > mostReps.weight)) {
      mostReps = set;
    }
  }

  return {
    heaviest: heaviest && { set: heaviest, value: heaviest.weight },
    bestE1rm: bestE1rm && { set: bestE1rm, value: e1rm(bestE1rm) },
    mostReps: mostReps && { set: mostReps, value: mostReps.reps },
  };
}

// Oldest first; equal timestamps fall back to id (UUIDv7 sorts by time), so ties are stable.
function oldestFirst(a: SetLog, b: SetLog): number {
  return a.logged_at - b.logged_at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
