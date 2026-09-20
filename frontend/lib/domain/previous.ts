import type { SetLog } from './types';

// The last WORKING set of an exercise — the values the log sheet prefills from.
// Warmup, drop and failure sets are ignored even when newer, because they aren't
// what you'd repeat. Returns null when there is no working set to repeat.
//
// `logs` may be unsorted and may include other exercises. Callers with a long
// history should pass only the exercise's recent logs (see the
// [exercise_id+logged_at] index) so the scan stays cheap.
export function previousSet(exerciseId: string, logs: readonly SetLog[]): SetLog | null {
  let latest: SetLog | null = null;
  for (const log of logs) {
    if (log.exercise_id !== exerciseId || log.kind !== 'working') continue;
    if (latest === null || isLater(log, latest)) latest = log;
  }
  return latest;
}

// Newer wins; equal timestamps fall back to id (UUIDv7 sorts by time) so the
// answer never depends on input order.
function isLater(a: SetLog, b: SetLog): boolean {
  return a.logged_at !== b.logged_at ? a.logged_at > b.logged_at : a.id > b.id;
}
