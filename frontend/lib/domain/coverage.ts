import type { Exercise, Pattern, SetLog } from './types';

// Which movement patterns a session has touched. Coverage, not completion: it says what
// happened and never what should have — it takes no template and no target, so a pattern you
// didn't train is simply not covered, and there is nothing to fail. Pure, and derived entirely
// from the session's sets (Hard Rule 1).

export type Coverage = Record<Pattern, boolean>;

// Every pattern is always a key. A pattern is covered when at least one of `sessionLogs` belongs
// to an exercise of that pattern. Any kind of set counts — a warmup is you training the lift, the
// same rule `staleness` uses. A set whose exercise isn't in `exercises` is ignored, and an
// archived exercise still counts, because the set happened.
export function coverage(sessionLogs: readonly SetLog[], exercises: readonly Exercise[]): Coverage {
  const patternOf = new Map(exercises.map((exercise) => [exercise.id, exercise.pattern]));
  const covered = new Set<Pattern>();
  for (const log of sessionLogs) {
    const pattern = patternOf.get(log.exercise_id);
    if (pattern !== undefined) covered.add(pattern);
  }
  return {
    squat: covered.has('squat'),
    hinge: covered.has('hinge'),
    push: covered.has('push'),
    pull: covered.has('pull'),
    accessory: covered.has('accessory'),
    core: covered.has('core'),
  };
}
