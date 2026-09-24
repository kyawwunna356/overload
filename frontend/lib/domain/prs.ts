import type { SetLog } from './types';

// Personal records: the reward moment (Hard Rule 1 — derived from set_logs, never stored).
//
// Three kinds, each honest on its own terms:
//   weight — heavier than any working set of this exercise before it;
//   reps   — more reps than ever AT THIS WEIGHT, so 15 × 40 kg never beats 5 × 100 kg: reps are
//            only ever compared with the same load (bodyweight sets, all at 0 kg, with each other);
//   e1rm   — a better Epley estimate; skipped for bodyweight, where it means nothing.
//
// The three overlap deliberately. Weight and reps are the records you feel, but each only speaks
// when there's something to compare with: a weight you've never used has no rep record to beat.
// e1RM is the one that still answers there — 95 × 7 after 100 × 5 breaks neither of the other two
// and is plainly the better set — so it's the only kind that regularly stands alone.
//
// Only WORKING sets count, on both sides: a drop set at 80% can't be a record and a to-failure
// set can't fake a rep record. Same rule as previousSet().
//
// A set is only ever judged against sets STRICTLY EARLIER than itself. Three consequences worth
// keeping: the answer never depends on input order, a caller can pass the whole history including
// the new set, and a record is PERMANENT — beating it next month doesn't un-record the set that
// held it, which is what lets the history list mark records for good.
//
// Pure: no clock, no I/O (Hard Rule 6).

export type PRKind = 'weight' | 'reps' | 'e1rm';

export type PR = {
  kind: PRKind;
  // The new record, in that kind's own unit: kg, reps, or estimated 1RM in kg.
  value: number;
  // What it beat, same unit. There is always something — the first working set is no record.
  previous: number;
};

export type SetPRs = {
  set: SetLog;
  // Never empty: a set with no records doesn't appear.
  prs: PR[];
};

// Floating point: 82.5 × (1 + 5/30) can land a hair above the same set's stored estimate, and a
// record you didn't earn is worse than one missed by 10 grams.
const EPSILON = 0.01;

// Epley: weight × (1 + reps / 30). Zero for a bodyweight set — there's no load to extrapolate
// from, so those lifts are judged on reps alone.
export function e1rm(set: Pick<SetLog, 'weight' | 'reps'>): number {
  return set.weight <= 0 ? 0 : set.weight * (1 + set.reps / 30);
}

// Which records `set` broke. [] when it broke none — including for the first working set of an
// exercise, which beats nothing and so isn't a record (a PR on every new lift would mean nothing).
// `history` may be unsorted, may hold other exercises, and may contain `set` itself.
export function detectPR(set: SetLog, history: readonly SetLog[]): PR[] {
  if (set.kind !== 'working') return [];

  const bests = emptyBests();
  for (const log of history) {
    if (log.exercise_id !== set.exercise_id || log.kind !== 'working') continue;
    if (isEarlier(log, set)) fold(bests, log);
  }
  return judge(set, bests);
}

// Every record in a history, keyed by set id: one pass per exercise, oldest first. The log sheet
// asks this for its whole list, so the pills and the flash can't disagree — both are `judge()`
// against the sets that came before.
//
// Cost: linear in the sets — every best it keeps is a map lookup. A year of one lift is a few
// hundred sets.
export function historyPRs(logs: readonly SetLog[]): Map<string, PR[]> {
  const working = logs.filter((log) => log.kind === 'working').sort(oldestFirst);

  const found = new Map<string, PR[]>();
  const perExercise = new Map<string, Bests>();
  for (const set of working) {
    let bests = perExercise.get(set.exercise_id);
    if (bests === undefined) {
      bests = emptyBests();
      perExercise.set(set.exercise_id, bests);
    }
    const prs = judge(set, bests);
    if (prs.length > 0) found.set(set.id, prs);
    fold(bests, set);
  }
  return found;
}

// The records broken during one session, oldest first — the recap's list. `history` should hold
// everything logged for the session's exercises; the session's own sets are added in case it
// doesn't, since a set must be judged against its predecessors, not against nothing.
export function sessionPRs(
  sessionSets: readonly SetLog[],
  history: readonly SetLog[],
): SetPRs[] {
  const all = [...new Map([...history, ...sessionSets].map((set) => [set.id, set])).values()];
  const records = historyPRs(all);

  return [...sessionSets]
    .sort(oldestFirst)
    .flatMap((set) => {
      const prs = records.get(set.id);
      return prs === undefined ? [] : [{ set, prs }];
    });
}

// The bests behind a set: everything needed to judge the next one.
type Bests = {
  // Null until a working set has been folded in — "no history", which is not a record to beat.
  weight: number | null;
  e1rm: number | null;
  // Best reps at each weight. Kept per weight, not as one maximum, because a rep record at 40 kg
  // says nothing about one at 100 kg — comparing across loads is how a light set steals a record.
  repsByWeight: Map<number, number>;
  count: number;
};

function emptyBests(): Bests {
  return { weight: null, e1rm: null, repsByWeight: new Map(), count: 0 };
}

function fold(bests: Bests, set: SetLog): void {
  bests.count += 1;
  if (bests.weight === null || set.weight > bests.weight) bests.weight = set.weight;

  const estimate = e1rm(set);
  if (estimate > 0 && (bests.e1rm === null || estimate > bests.e1rm)) bests.e1rm = estimate;

  const reps = bests.repsByWeight.get(set.weight);
  if (reps === undefined || set.reps > reps) bests.repsByWeight.set(set.weight, set.reps);
}

// The one definition of a record, shared by detectPR and the history sweep. Ties never count:
// repeating your best is not beating it.
function judge(set: SetLog, bests: Bests): PR[] {
  if (bests.count === 0) return [];

  const prs: PR[] = [];
  if (bests.weight !== null && set.weight > bests.weight) {
    prs.push({ kind: 'weight', value: set.weight, previous: bests.weight });
  }

  // undefined means this weight is new, so there's no rep record to beat — only, perhaps, a
  // weight record above, or the estimate below.
  const reps = bests.repsByWeight.get(set.weight);
  if (reps !== undefined && set.reps > reps) {
    prs.push({ kind: 'reps', value: set.reps, previous: reps });
  }

  const estimate = e1rm(set);
  if (estimate > 0 && bests.e1rm !== null && estimate > bests.e1rm + EPSILON) {
    prs.push({ kind: 'e1rm', value: estimate, previous: bests.e1rm });
  }
  return prs;
}

// Strictly before `later`; equal timestamps fall back to id (UUIDv7 sorts by time), the same
// tie-break previousSet uses, so "earlier" means one thing across the domain.
function isEarlier(set: SetLog, later: SetLog): boolean {
  return set.logged_at !== later.logged_at
    ? set.logged_at < later.logged_at
    : set.id < later.id;
}

function oldestFirst(a: SetLog, b: SetLog): number {
  return a.logged_at - b.logged_at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
