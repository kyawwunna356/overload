import { describe, expect, it } from 'vitest';
import { previousSet } from './previous';
import { makeSet } from './test-utils';

describe('previousSet', () => {
  it('returns null when there are no logs', () => {
    expect(previousSet('ex-1', [])).toBeNull();
  });

  it("returns null when only other exercises were logged", () => {
    const logs = [makeSet({ exercise_id: 'ex-2' }), makeSet({ exercise_id: 'ex-3' })];
    expect(previousSet('ex-1', logs)).toBeNull();
  });

  it('picks the newest working set', () => {
    const oldest = makeSet({ logged_at: 1_000, weight: 60 });
    const newest = makeSet({ logged_at: 3_000, weight: 65 });
    const middle = makeSet({ logged_at: 2_000, weight: 62.5 });
    expect(previousSet('ex-1', [oldest, newest, middle])).toBe(newest);
  });

  it('ignores other exercises even when they are newer', () => {
    const mine = makeSet({ exercise_id: 'ex-1', logged_at: 1_000 });
    const other = makeSet({ exercise_id: 'ex-2', logged_at: 9_000 });
    expect(previousSet('ex-1', [mine, other])).toBe(mine);
  });

  it.each(['warmup', 'drop', 'failure'] as const)(
    'ignores a newer %s set and returns the working set before it',
    (kind) => {
      const working = makeSet({ logged_at: 1_000, weight: 80, reps: 5 });
      const newer = makeSet({ logged_at: 2_000, weight: 20, reps: 12, kind });
      expect(previousSet('ex-1', [working, newer])).toBe(working);
    },
  );

  it('returns null when the exercise only has non-working sets', () => {
    const logs = [
      makeSet({ logged_at: 1_000, kind: 'warmup' }),
      makeSet({ logged_at: 2_000, kind: 'drop' }),
      makeSet({ logged_at: 3_000, kind: 'failure' }),
    ];
    expect(previousSet('ex-1', logs)).toBeNull();
  });

  it('gives the same answer whatever order the logs arrive in', () => {
    const a = makeSet({ logged_at: 1_000 });
    const b = makeSet({ logged_at: 2_000 });
    const c = makeSet({ logged_at: 3_000 });
    const orders = [
      [a, b, c],
      [c, b, a],
      [b, c, a],
      [b, a, c],
    ];
    for (const logs of orders) expect(previousSet('ex-1', logs)).toBe(c);
  });

  it('breaks logged_at ties by id, independent of input order', () => {
    const first = makeSet({ id: 'a', logged_at: 5_000 });
    const second = makeSet({ id: 'b', logged_at: 5_000 });
    expect(previousSet('ex-1', [first, second])).toBe(second);
    expect(previousSet('ex-1', [second, first])).toBe(second);
  });

  it('does not mutate its input', () => {
    const logs = [makeSet({ logged_at: 3_000 }), makeSet({ logged_at: 1_000 })];
    const before = structuredClone(logs);
    previousSet('ex-1', logs);
    expect(logs).toEqual(before);
  });
});
