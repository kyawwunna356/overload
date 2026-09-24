import { masteryLevel } from './mastery';
import { sessionPRs, type SetPRs } from './prs';
import type { DerivedSession } from './sessions';
import type { SetLog } from './types';

// What a finished session was worth: one number for the weight moved, the records it broke, and
// the lifts it levelled up. Every part is derived from the sets (Hard Rule 1) and none of it
// compares you with another session, so there's nothing to fall short of. Pure: no clock, no I/O.

export type LevelUp = {
  exerciseId: string;
  // The level reached.
  level: number;
};

export type Recap = {
  // Σ weight × reps over every set of the session, warmups included; bodyweight adds 0.
  totalKg: number;
  // Oldest first, judged exactly as the flash and the history pills are.
  prs: SetPRs[];
  // In the order each lift was first performed in the session.
  levelUps: LevelUp[];
};

// `history` holds the session's exercises' sets; it may include the session's own sets, sets
// after the session (ignored) and other exercises, in any order.
export function sessionRecap(session: DerivedSession, history: readonly SetLog[]): Recap {
  const sessionIds = new Set(session.sets.map((set) => set.id));
  const before = history.filter((set) => set.logged_at < session.started_at && !sessionIds.has(set.id));
  const through = [...before, ...session.sets];

  const exerciseIds = [...new Set(session.sets.map((set) => set.exercise_id))];
  const levelUps = exerciseIds.flatMap((exerciseId) => {
    const from = masteryLevel(exerciseId, before).level;
    const to = masteryLevel(exerciseId, through).level;
    return to > from ? [{ exerciseId, level: to }] : [];
  });

  return {
    totalKg: session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    prs: sessionPRs(session.sets, before),
    levelUps,
  };
}

// One card of the finish moment's deck. Records and level-ups are paged, so a long list becomes
// several cards; `page` counts from 1 and `of` is how many cards that section has.
export type RecapCard =
  | { kind: 'total' }
  | { kind: 'records'; prs: SetPRs[]; page: number; of: number }
  | { kind: 'levels'; levelUps: LevelUp[]; page: number; of: number };

// The deck, in order: the total, then the records, then the level-ups. A section with nothing in
// it has no card, so a quiet session is one card — never an empty "0 records".
export function recapCards(
  recap: Recap,
  perCard: { records: number; levels: number },
): RecapCard[] {
  const records = chunk(recap.prs, perCard.records);
  const levels = chunk(recap.levelUps, perCard.levels);
  return [
    { kind: 'total' },
    ...records.map((prs, i): RecapCard => ({ kind: 'records', prs, page: i + 1, of: records.length })),
    ...levels.map((levelUps, i): RecapCard => ({ kind: 'levels', levelUps, page: i + 1, of: levels.length })),
  ];
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const step = Math.max(1, size);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += step) pages.push(items.slice(i, i + step));
  return pages;
}
