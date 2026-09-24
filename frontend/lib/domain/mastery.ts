import { dayKey, localDate } from './history';
import type { SetLog } from './types';

// How long you've been doing a lift, as a level that only ever rises. A session of a lift is a
// local calendar day with any set of it (warmups too, like the week strip), so doing it twice in a
// day counts once. Each level takes one more session than the last: level L is reached at
// L·(L+1)/2 sessions — 1, 3, 6, 10, 15, 21 … — so early levels come quickly and later ones mean
// real time under the bar. There is no cap and nothing to lose. Pure: no clock, no I/O.

export type Mastery = {
  // 0 for a lift never done.
  level: number;
  // Distinct days with a set of this exercise.
  sessions: number;
  // The session count that reaches level + 1.
  nextLevelAt: number;
};

// `logs` may hold other exercises; they're skipped.
export function masteryLevel(exerciseId: string, logs: readonly SetLog[]): Mastery {
  const days = new Set<string>();
  for (const log of logs) {
    if (log.exercise_id === exerciseId) days.add(dayKey(localDate(log.logged_at)));
  }
  const sessions = days.size;

  let level = 0;
  while (threshold(level + 1) <= sessions) level += 1;
  return { level, sessions, nextLevelAt: threshold(level + 1) };
}

// Sessions needed for `level`: the triangular number, in integers so nothing rounds.
function threshold(level: number): number {
  return (level * (level + 1)) / 2;
}
