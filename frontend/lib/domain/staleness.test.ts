import { describe, expect, it } from 'vitest';
import { staleness } from './staleness';
import { makeSet } from './test-utils';

const DAY = 86_400_000;
const NOW = 100 * DAY;

describe('staleness', () => {
  it('returns null for an exercise that was never performed', () => {
    expect(staleness('ex-1', [], NOW)).toBeNull();
    expect(staleness('ex-1', [makeSet({ exercise_id: 'ex-2' })], NOW)).toBeNull();
  });

  it('returns fractional days since the last set', () => {
    const logs = [makeSet({ logged_at: NOW - 2.5 * DAY })];
    expect(staleness('ex-1', logs, NOW)).toBe(2.5);
  });

  it('is 0 for a set logged at exactly now', () => {
    expect(staleness('ex-1', [makeSet({ logged_at: NOW })], NOW)).toBe(0);
  });

  it('uses the most recent of many sets', () => {
    const logs = [
      makeSet({ logged_at: NOW - 10 * DAY }),
      makeSet({ logged_at: NOW - 3 * DAY }),
      makeSet({ logged_at: NOW - 7 * DAY }),
    ];
    expect(staleness('ex-1', logs, NOW)).toBe(3);
  });

  it('ignores other exercises', () => {
    const logs = [
      makeSet({ exercise_id: 'ex-1', logged_at: NOW - 6 * DAY }),
      makeSet({ exercise_id: 'ex-2', logged_at: NOW - 1 * DAY }),
    ];
    expect(staleness('ex-1', logs, NOW)).toBe(6);
  });

  it.each(['warmup', 'working', 'drop', 'failure'] as const)(
    'counts a %s set as performing the exercise',
    (kind) => {
      const logs = [makeSet({ logged_at: NOW - 4 * DAY, kind })];
      expect(staleness('ex-1', logs, NOW)).toBe(4);
    },
  );

  it('clamps a set stamped in the future to 0', () => {
    const logs = [makeSet({ logged_at: NOW + 5 * 60_000 })];
    expect(staleness('ex-1', logs, NOW)).toBe(0);
  });

  it('gives the same answer whatever order the logs arrive in', () => {
    const a = makeSet({ logged_at: NOW - 9 * DAY });
    const b = makeSet({ logged_at: NOW - 2 * DAY });
    const c = makeSet({ logged_at: NOW - 5 * DAY });
    expect(staleness('ex-1', [a, b, c], NOW)).toBe(2);
    expect(staleness('ex-1', [c, b, a], NOW)).toBe(2);
    expect(staleness('ex-1', [b, a, c], NOW)).toBe(2);
  });

  it('does not mutate its input', () => {
    const logs = [makeSet({ logged_at: NOW - 2 * DAY }), makeSet({ logged_at: NOW - 8 * DAY })];
    const before = structuredClone(logs);
    staleness('ex-1', logs, NOW);
    expect(logs).toEqual(before);
  });
});
