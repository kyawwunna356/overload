import { describe, expect, it } from 'vitest';
import { detectPR, e1rm, historyPRs, sessionPRs, type PRKind } from './prs';
import { makeSet } from './test-utils';
import type { SetLog } from './types';

// The kinds a set broke, which is all most tests care about.
const kinds = (set: SetLog, history: readonly SetLog[]): PRKind[] =>
  detectPR(set, history).map((pr) => pr.kind);

describe('e1rm', () => {
  it('is zero for a bodyweight set, which has no load to extrapolate from', () => {
    expect(e1rm({ weight: 0, reps: 12 })).toBe(0);
  });

  it('follows Epley: weight x (1 + reps / 30)', () => {
    expect(e1rm({ weight: 100, reps: 5 })).toBeCloseTo(116.667, 3);
    expect(e1rm({ weight: 100, reps: 1 })).toBeCloseTo(103.333, 3);
  });

  it('rates more reps at the same weight higher', () => {
    expect(e1rm({ weight: 100, reps: 6 })).toBeGreaterThan(e1rm({ weight: 100, reps: 5 }));
  });
});

describe('detectPR', () => {
  it('finds nothing with no history', () => {
    expect(detectPR(makeSet({ weight: 100, reps: 5 }), [])).toEqual([]);
  });

  it('does not make the first working set of an exercise a record', () => {
    const first = makeSet({ logged_at: 2_000, weight: 100, reps: 5 });
    const others = [makeSet({ exercise_id: 'ex-2', logged_at: 1_000, weight: 200, reps: 10 })];
    expect(detectPR(first, others)).toEqual([]);
  });

  it('reports a heavier set as a weight record, with what it beat', () => {
    const history = [makeSet({ logged_at: 1_000, weight: 97.5, reps: 5 })];
    const heavier = makeSet({ logged_at: 2_000, weight: 100, reps: 5 });
    expect(detectPR(heavier, history)).toEqual([
      { kind: 'weight', value: 100, previous: 97.5 },
      { kind: 'e1rm', value: e1rm(heavier), previous: e1rm(history[0]) },
    ]);
  });

  it('finds nothing when you repeat your best exactly', () => {
    const history = [makeSet({ logged_at: 1_000, weight: 100, reps: 5 })];
    expect(kinds(makeSet({ logged_at: 2_000, weight: 100, reps: 5 }), history)).toEqual([]);
  });

  it('finds nothing in a lighter, shorter set', () => {
    const history = [makeSet({ logged_at: 1_000, weight: 100, reps: 5 })];
    expect(kinds(makeSet({ logged_at: 2_000, weight: 90, reps: 3 }), history)).toEqual([]);
  });

  it('reports an extra rep at the same weight as a rep record', () => {
    const history = [makeSet({ logged_at: 1_000, weight: 100, reps: 5 })];
    const prs = detectPR(makeSet({ logged_at: 2_000, weight: 100, reps: 6 }), history);
    expect(prs.map((pr) => pr.kind)).toEqual(['reps', 'e1rm']);
    expect(prs[0]).toEqual({ kind: 'reps', value: 6, previous: 5 });
  });

  it('does not count more reps at a lighter weight as a rep record', () => {
    const history = [makeSet({ logged_at: 1_000, weight: 100, reps: 5 })];
    expect(kinds(makeSet({ logged_at: 2_000, weight: 40, reps: 15 }), history)).toEqual([]);
  });

  it('compares reps only with the same weight', () => {
    const history = [
      makeSet({ id: 'light', logged_at: 1_000, weight: 40, reps: 20 }),
      makeSet({ id: 'heavy', logged_at: 2_000, weight: 100, reps: 5 }),
    ];
    // A weight never used before has no rep record to beat, whatever was done above or below it.
    expect(kinds(makeSet({ logged_at: 3_000, weight: 90, reps: 8 }), history)).toEqual([]);
    // The same weight does.
    const prs = detectPR(makeSet({ logged_at: 3_000, weight: 100, reps: 6 }), history);
    expect(prs.find((pr) => pr.kind === 'reps')).toEqual({ kind: 'reps', value: 6, previous: 5 });
  });

  it('reports a heavier set for fewer reps as a weight record', () => {
    const history = [makeSet({ logged_at: 1_000, weight: 100, reps: 8 })];
    expect(kinds(makeSet({ logged_at: 2_000, weight: 105, reps: 3 }), history)).toEqual(['weight']);
  });

  it('judges bodyweight sets on reps alone', () => {
    const history = [makeSet({ logged_at: 1_000, weight: 0, reps: 9 })];
    expect(kinds(makeSet({ logged_at: 2_000, weight: 0, reps: 10 }), history)).toEqual(['reps']);
  });

  it('keeps bodyweight and loaded sets of the same exercise apart', () => {
    // Weighted pull-ups and bodyweight ones are different loads, so neither holds the other's
    // rep record: 10 free reps don't beat 6 with a 20 kg belt, and they aren't beaten by them.
    const history = [
      makeSet({ id: 'loaded', logged_at: 1_000, weight: 20, reps: 6 }),
      makeSet({ id: 'free', logged_at: 1_100, weight: 0, reps: 10 }),
    ];
    expect(kinds(makeSet({ logged_at: 2_000, weight: 20, reps: 7 }), history)).toEqual([
      'reps',
      'e1rm',
    ]);
    expect(kinds(makeSet({ logged_at: 2_000, weight: 0, reps: 9 }), history)).toEqual([]);
    expect(kinds(makeSet({ logged_at: 2_000, weight: 0, reps: 11 }), history)).toEqual(['reps']);
  });

  it.each(['warmup', 'drop', 'failure'] as const)('never makes a %s set a record', (kind) => {
    const history = [makeSet({ logged_at: 1_000, weight: 100, reps: 5 })];
    expect(detectPR(makeSet({ logged_at: 2_000, weight: 200, reps: 20, kind }), history)).toEqual([]);
  });

  it.each(['warmup', 'drop', 'failure'] as const)(
    'ignores a %s set in the history, however heavy',
    (kind) => {
      const history = [
        makeSet({ id: 'w', logged_at: 1_000, weight: 200, reps: 20, kind }),
        makeSet({ id: 'working', logged_at: 1_500, weight: 90, reps: 5 }),
      ];
      expect(kinds(makeSet({ logged_at: 2_000, weight: 95, reps: 5 }), history)).toEqual([
        'weight',
        'e1rm',
      ]);
    },
  );

  it('ignores other exercises', () => {
    const history = [
      makeSet({ exercise_id: 'ex-2', logged_at: 1_000, weight: 200, reps: 10 }),
      makeSet({ exercise_id: 'ex-1', logged_at: 1_100, weight: 90, reps: 5 }),
    ];
    expect(kinds(makeSet({ exercise_id: 'ex-1', logged_at: 2_000, weight: 95, reps: 5 }), history))
      .toEqual(['weight', 'e1rm']);
  });

  it('ignores the set itself when it appears in its own history', () => {
    const set = makeSet({ logged_at: 2_000, weight: 100, reps: 5 });
    const history = [makeSet({ logged_at: 1_000, weight: 90, reps: 5 }), set];
    expect(kinds(set, history)).toEqual(['weight', 'e1rm']);
  });

  it('ignores sets logged after it, so an old record stays a record', () => {
    const old = makeSet({ logged_at: 2_000, weight: 100, reps: 5 });
    const history = [
      makeSet({ logged_at: 1_000, weight: 90, reps: 5 }),
      old,
      makeSet({ logged_at: 3_000, weight: 120, reps: 5 }),
    ];
    expect(kinds(old, history)).toEqual(['weight', 'e1rm']);
  });

  it('gives the same answer whatever order the history arrives in', () => {
    const a = makeSet({ id: 'a', logged_at: 1_000, weight: 90, reps: 5 });
    const b = makeSet({ id: 'b', logged_at: 2_000, weight: 95, reps: 5 });
    const set = makeSet({ id: 'c', logged_at: 3_000, weight: 100, reps: 5 });
    for (const history of [[a, b], [b, a]]) {
      expect(detectPR(set, history)).toEqual([
        { kind: 'weight', value: 100, previous: 95 },
        { kind: 'e1rm', value: e1rm(set), previous: e1rm(b) },
      ]);
    }
  });

  it('breaks a logged_at tie by id, so a same-second set counts as earlier only if its id is', () => {
    const set = makeSet({ id: 'm', logged_at: 5_000, weight: 100, reps: 5 });
    const before = makeSet({ id: 'a', logged_at: 5_000, weight: 95, reps: 5 });
    const after = makeSet({ id: 'z', logged_at: 5_000, weight: 95, reps: 5 });
    expect(kinds(set, [before])).toEqual(['weight', 'e1rm']);
    expect(kinds(set, [after])).toEqual([]);
  });

  it('does not count an estimate that only matches the best one', () => {
    const history = [
      // 90 x 10 and 100 x 6 are both exactly 120 kg estimated.
      makeSet({ id: 'a', logged_at: 1_000, weight: 90, reps: 10 }),
      makeSet({ id: 'b', logged_at: 1_100, weight: 100, reps: 5 }),
    ];
    expect(kinds(makeSet({ logged_at: 2_000, weight: 100, reps: 6 }), history)).toEqual(['reps']);
  });

  it('reports an estimate record alone when a new weight is plainly a better set', () => {
    // 95 x 7 is neither heavier than 100 nor a rep record (95 kg is new), but it is clearly the
    // best set so far. The estimate is the only kind that can say so.
    const history = [makeSet({ id: 'top', logged_at: 1_000, weight: 100, reps: 5 })];
    const better = makeSet({ logged_at: 2_000, weight: 95, reps: 7 });
    expect(detectPR(better, history)).toEqual([
      { kind: 'e1rm', value: e1rm(better), previous: e1rm(history[0]) },
    ]);
  });

  it('does not report an estimate record for a new weight that is a worse set', () => {
    const history = [makeSet({ id: 'top', logged_at: 1_000, weight: 100, reps: 5 })];
    expect(kinds(makeSet({ logged_at: 2_000, weight: 95, reps: 5 }), history)).toEqual([]);
  });

  it('does not mutate its input', () => {
    const history = [
      makeSet({ logged_at: 2_000, weight: 95, reps: 5 }),
      makeSet({ logged_at: 1_000, weight: 90, reps: 5 }),
    ];
    const before = structuredClone(history);
    detectPR(makeSet({ logged_at: 3_000, weight: 100, reps: 5 }), history);
    expect(history).toEqual(before);
  });
});

describe('historyPRs', () => {
  const history = [
    makeSet({ id: 'a', logged_at: 1_000, weight: 90, reps: 5 }),
    makeSet({ id: 'b', logged_at: 2_000, weight: 95, reps: 5 }),
    makeSet({ id: 'c', logged_at: 3_000, weight: 95, reps: 6 }),
    makeSet({ id: 'd', logged_at: 4_000, weight: 90, reps: 8 }),
    makeSet({ id: 'e', logged_at: 5_000, weight: 100, reps: 5 }),
  ];

  it('agrees with detectPR for every set', () => {
    const found = historyPRs(history);
    for (const set of history) {
      expect(found.get(set.id) ?? []).toEqual(detectPR(set, history));
    }
  });

  it('leaves the first set of an exercise unmarked', () => {
    expect(historyPRs(history).has('a')).toBe(false);
  });

  it('marks only the first of three identical top sets', () => {
    const sets = [
      makeSet({ id: 'a', logged_at: 1_000, weight: 90, reps: 5 }),
      makeSet({ id: 'top1', logged_at: 2_000, weight: 100, reps: 5 }),
      makeSet({ id: 'top2', logged_at: 3_000, weight: 100, reps: 5 }),
      makeSet({ id: 'top3', logged_at: 4_000, weight: 100, reps: 5 }),
    ];
    const found = historyPRs(sets);
    expect([...found.keys()]).toEqual(['top1']);
  });

  it('gives the same answer whatever order the sets arrive in', () => {
    const forwards = historyPRs(history);
    const backwards = historyPRs([...history].reverse());
    expect([...backwards.keys()].sort()).toEqual([...forwards.keys()].sort());
  });

  it('keeps exercises apart', () => {
    const sets = [
      makeSet({ id: 'squat-1', exercise_id: 'ex-1', logged_at: 1_000, weight: 100, reps: 5 }),
      makeSet({ id: 'curl-1', exercise_id: 'ex-2', logged_at: 2_000, weight: 20, reps: 10 }),
      // 25 kg is no record for the squat, but it is the curl's second set and a heavier one.
      makeSet({ id: 'curl-2', exercise_id: 'ex-2', logged_at: 3_000, weight: 25, reps: 10 }),
    ];
    expect([...historyPRs(sets).keys()]).toEqual(['curl-2']);
  });

  it('ignores warmup, drop and failure sets entirely', () => {
    const sets = [
      makeSet({ id: 'a', logged_at: 1_000, weight: 90, reps: 5 }),
      makeSet({ id: 'huge-warmup', logged_at: 2_000, weight: 300, reps: 1, kind: 'warmup' }),
      makeSet({ id: 'b', logged_at: 3_000, weight: 95, reps: 5 }),
    ];
    expect([...historyPRs(sets).keys()]).toEqual(['b']);
  });
});

describe('sessionPRs', () => {
  const older = [
    makeSet({ id: 'old-1', logged_at: 1_000, weight: 90, reps: 5 }),
    makeSet({ id: 'old-2', logged_at: 2_000, weight: 95, reps: 5 }),
  ];
  const session = [
    makeSet({ id: 'today-1', logged_at: 10_000, weight: 100, reps: 5 }),
    makeSet({ id: 'today-2', logged_at: 11_000, weight: 100, reps: 5 }),
    makeSet({ id: 'today-3', logged_at: 12_000, weight: 100, reps: 6 }),
  ];

  it('lists the sets that broke something, oldest first', () => {
    const found = sessionPRs(session, [...older, ...session]);
    expect(found.map((entry) => entry.set.id)).toEqual(['today-1', 'today-3']);
    expect(found[0].prs.map((pr) => pr.kind)).toEqual(['weight', 'e1rm']);
    expect(found[1].prs.map((pr) => pr.kind)).toEqual(['reps', 'e1rm']);
  });

  it('judges a session set against the earlier sets of the same session', () => {
    // today-2 repeats today-1 exactly, so the second one is not a record of its own.
    const found = sessionPRs(session, [...older, ...session]);
    expect(found.map((entry) => entry.set.id)).not.toContain('today-2');
  });

  it('works when the history leaves the session out', () => {
    const found = sessionPRs(session, older);
    expect(found.map((entry) => entry.set.id)).toEqual(['today-1', 'today-3']);
  });

  it('is empty for a session that beat nothing', () => {
    const repeats = [makeSet({ id: 'same', logged_at: 10_000, weight: 95, reps: 5 })];
    expect(sessionPRs(repeats, [...older, ...repeats])).toEqual([]);
  });

  it('is empty for a session with no sets', () => {
    expect(sessionPRs([], older)).toEqual([]);
  });

  it('does not mutate its input', () => {
    const before = structuredClone(session);
    sessionPRs(session, older);
    expect(session).toEqual(before);
  });
});
