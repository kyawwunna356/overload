import { describe, expect, it } from 'vitest';
import { previousSession } from './previous';
import { makeSet } from './test-utils';

const MIN = 60 * 1000;
const GAP = 90;
const DAY = 24 * 60 * MIN;

// Three sets a few minutes apart, starting at `start`.
function session(start: number, weights: number[], exercise = 'ex-1') {
  return weights.map((weight, i) =>
    makeSet({ exercise_id: exercise, logged_at: start + i * 3 * MIN, weight }),
  );
}

describe('previousSession', () => {
  it('is empty with no history', () => {
    expect(previousSession('ex-1', [], Infinity, GAP, [])).toEqual([]);
  });

  it("returns the latest session's working sets, oldest first", () => {
    const older = session(0, [70, 70, 70]);
    const latest = session(3 * DAY, [80, 80, 77.5]);
    const result = previousSession('ex-1', [...latest, ...older].reverse(), Infinity, GAP, []);
    expect(result.map((set) => set.weight)).toEqual([80, 80, 77.5]);
  });

  it('leaves out sets at or after `before`, so today is never last time', () => {
    const last = session(0, [80, 80]);
    const today = session(3 * DAY, [82.5]);
    const result = previousSession('ex-1', [...last, ...today], today[0].logged_at, GAP, []);
    expect(result.map((set) => set.weight)).toEqual([80, 80]);
  });

  it("splits this exercise's own sets by the gap rule, so two sessions on one day stay apart", () => {
    const morning = session(0, [60, 60]);
    const evening = session(10 * 60 * MIN, [65, 65]);
    const result = previousSession('ex-1', [...morning, ...evening], Infinity, GAP, []);
    expect(result.map((set) => set.weight)).toEqual([65, 65]);
  });

  it('splits at an end marker even inside the gap', () => {
    const first = session(0, [60]);
    const second = session(20 * MIN, [70, 70]);
    const marker = 10 * MIN;
    const result = previousSession('ex-1', [...first, ...second], Infinity, GAP, [marker]);
    expect(result.map((set) => set.weight)).toEqual([70, 70]);
  });

  it('ignores other exercises', () => {
    const mine = session(0, [80]);
    const other = session(DAY, [40, 40], 'ex-2');
    expect(previousSession('ex-1', [...mine, ...other], Infinity, GAP, []).map((s) => s.weight)).toEqual([80]);
  });

  it('keeps only working sets, and skips a session that had none', () => {
    const real = session(0, [80, 80]);
    const warmupOnly = [makeSet({ logged_at: 3 * DAY, weight: 20, kind: 'warmup' })];
    const mixed = [
      makeSet({ logged_at: 6 * DAY, weight: 40, kind: 'warmup' }),
      makeSet({ logged_at: 6 * DAY + MIN, weight: 85 }),
    ];
    expect(previousSession('ex-1', [...real, ...warmupOnly], Infinity, GAP, []).map((s) => s.weight)).toEqual([80, 80]);
    expect(previousSession('ex-1', [...real, ...mixed], Infinity, GAP, []).map((s) => s.weight)).toEqual([85]);
  });
});
