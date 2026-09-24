import { describe, expect, it } from 'vitest';
import { masteryLevel } from './mastery';
import { makeSet } from './test-utils';

// Dates use the LOCAL-time constructor, so these tests give the same result in any timezone.
const at = (month: number, date: number, hour = 12, minute = 0) =>
  new Date(2026, month - 1, date, hour, minute).getTime();

// One set on each of `count` consecutive days from 1 August.
const days = (count: number, exercise_id = 'ex-1') =>
  Array.from({ length: count }, (_, i) => makeSet({ exercise_id, logged_at: at(8, 1 + i) }));

describe('masteryLevel', () => {
  it('is level 0 for a lift never done', () => {
    expect(masteryLevel('ex-1', [])).toEqual({ level: 0, sessions: 0, nextLevelAt: 1 });
  });

  it('is level 1 after one session', () => {
    expect(masteryLevel('ex-1', days(1))).toEqual({ level: 1, sessions: 1, nextLevelAt: 3 });
  });

  it.each([
    [2, 1],
    [3, 2],
    [5, 2],
    [6, 3],
    [9, 3],
    [10, 4],
    [14, 4],
    [15, 5],
    [20, 5],
    [21, 6],
  ])('%i sessions is level %i', (sessions, level) => {
    expect(masteryLevel('ex-1', days(sessions)).level).toBe(level);
  });

  it('gives the session count that reaches the next level', () => {
    expect(masteryLevel('ex-1', days(16)).nextLevelAt).toBe(21);
    expect(masteryLevel('ex-1', days(21)).nextLevelAt).toBe(28);
  });

  it('counts several sets on one day once', () => {
    const sets = [at(8, 1, 9), at(8, 1, 9, 5), at(8, 1, 18)].map((logged_at) =>
      makeSet({ logged_at }),
    );
    expect(masteryLevel('ex-1', sets).sessions).toBe(1);
  });

  it('counts either side of midnight as two days', () => {
    const sets = [makeSet({ logged_at: at(8, 1, 23, 59) }), makeSet({ logged_at: at(8, 2, 0, 1) })];
    expect(masteryLevel('ex-1', sets).sessions).toBe(2);
  });

  it('counts a day with only warmups', () => {
    expect(masteryLevel('ex-1', [makeSet({ kind: 'warmup' })]).level).toBe(1);
  });

  it('ignores other exercises', () => {
    expect(masteryLevel('ex-1', [...days(3), ...days(20, 'ex-2')]).sessions).toBe(3);
  });

  it('gives the same answer whatever order the sets arrive in', () => {
    const sets = days(7);
    expect(masteryLevel('ex-1', [...sets].reverse())).toEqual(masteryLevel('ex-1', sets));
  });
});
