import { deriveSessions } from './sessions';
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

// The working sets of this exercise's most recent session that started before `before`, oldest
// first — "last time", set by set, for the log sheet's Last time column. Sessions here are this
// exercise's own sets split by the gap rule and end markers (the user's choice), not calendar days,
// so two sessions on one day stay apart. A session with no working set (warmups only) is skipped
// in favour of the one before it. Empty when there's nothing earlier.
//
// `before` is normally the current session's first set, so today's sets never count as last time;
// pass Infinity when no session is active, and the latest session is last time.
export function previousSession(
  exerciseId: string,
  logs: readonly SetLog[],
  before: number,
  gapMinutes: number,
  endMarkers: readonly number[],
): SetLog[] {
  const earlier = logs.filter((log) => log.exercise_id === exerciseId && log.logged_at < before);
  const sessions = deriveSessions(earlier, gapMinutes, endMarkers);
  for (let i = sessions.length - 1; i >= 0; i--) {
    const working = sessions[i].sets.filter((set) => set.kind === 'working');
    if (working.length > 0) return working;
  }
  return [];
}
