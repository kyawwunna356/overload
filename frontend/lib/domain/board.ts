import type { ListItem } from './list';
import { masteryLevel } from './mastery';
import { previousSet } from './previous';
import { staleness } from './staleness';
import { PATTERNS, type Exercise, type Pattern, type SetLog } from './types';

// What a board row says on its second line.
//   today — done in the session you're in: how many sets, and the best of them.
//   last  — not done this session: the last working set (null if only warmups were ever logged)
//           and the days since any set.
//   new   — never logged.
export type RowState =
  | { kind: 'today'; sets: number; best: SetLog }
  | { kind: 'last'; set: SetLog | null; daysAgo: number }
  | { kind: 'new' };

export type BoardRow = {
  exercise: Exercise;
  state: RowState;
  // The mastery level; 0 for a lift never done.
  level: number;
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
// Pure and derived from `logs` and your list (Hard Rules 1 and 6). `logs` should be every set of
// the listed exercises, since the level counts days; `sessionSets` is the session you're in, or
// empty when there isn't one.
export function buildBoard(
  exercises: readonly Exercise[],
  logs: readonly SetLog[],
  now: number,
  list: readonly ListItem[],
  sessionSets: readonly SetLog[] = [],
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
      state: rowState(exercise.id, sessionSets, logs, now),
      level: masteryLevel(exercise.id, logs).level,
    });
  }

  // filter() keeps the list order, so each group reads in the order you set.
  return PATTERNS.map((pattern) => ({
    pattern,
    rows: rows.filter((row) => row.exercise.pattern === pattern),
  }));
}

// A row's second line. Any set of this exercise in `sessionSets` makes it "today", which the row
// keeps until the session ends — by Finish or the 90-minute gap — when it goes back to "last".
// Both arrays may hold other exercises.
export function rowState(
  exerciseId: string,
  sessionSets: readonly SetLog[],
  history: readonly SetLog[],
  now: number,
): RowState {
  const today = sessionSets.filter((set) => set.exercise_id === exerciseId);
  if (today.length > 0) {
    const working = today.filter((set) => set.kind === 'working');
    return { kind: 'today', sets: today.length, best: bestOf(working.length > 0 ? working : today) };
  }
  const daysAgo = staleness(exerciseId, history, now);
  if (daysAgo === null) return { kind: 'new' };
  return { kind: 'last', set: previousSet(exerciseId, history), daysAgo };
}

// The heaviest set; at the same weight, more reps; then the earlier one, so it's stable.
function bestOf(sets: readonly SetLog[]): SetLog {
  return sets.reduce((best, set) => {
    if (set.weight !== best.weight) return set.weight > best.weight ? set : best;
    if (set.reps !== best.reps) return set.reps > best.reps ? set : best;
    return set.logged_at < best.logged_at ? set : best;
  });
}

// "Next up" on the log sheet: the first exercise after `currentId` in board order that has no set
// this session, wrapping round to the top; null when every other exercise is done. Display only —
// it reads your list for order and never limits what you can log (Hard Rule 3). If `currentId`
// isn't on the board, it starts from the top.
export function nextUp(
  order: readonly string[],
  doneThisSession: ReadonlySet<string>,
  currentId: string,
): string | null {
  const start = order.indexOf(currentId);
  for (let step = 1; step <= order.length; step++) {
    const id = order[(start + step) % order.length];
    if (id !== currentId && !doneThisSession.has(id)) return id;
  }
  return null;
}

// Your order. Equal positions fall back to the exercise id, so the result never depends on
// the order the rows came out of the database.
function byPosition(a: ListItem, b: ListItem): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.exercise_id < b.exercise_id ? -1 : a.exercise_id > b.exercise_id ? 1 : 0;
}
