import type { SetLog } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// Days since the exercise was last performed, as a fractional number — the board
// sorts on it and rounds only for display. Any kind of set counts as performing
// the lift, warmups included.
//
// Returns null for an exercise that has never been logged, rather than Infinity,
// so the board decides where those go instead of them topping every group.
// `now` is passed in (never read from the clock), and a log stamped slightly in
// the future clamps to 0.
export function staleness(exerciseId: string, logs: readonly SetLog[], now: number): number | null {
  let last: number | null = null;
  for (const log of logs) {
    if (log.exercise_id !== exerciseId) continue;
    if (last === null || log.logged_at > last) last = log.logged_at;
  }
  return last === null ? null : Math.max(0, (now - last) / DAY_MS);
}
