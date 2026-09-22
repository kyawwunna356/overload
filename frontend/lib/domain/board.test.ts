import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import type { ListItem } from './list';
import { makeExercise, makeSet } from './test-utils';
import { PATTERNS, type Exercise } from './types';

const DAY = 86_400_000;
const NOW = 100 * DAY;

// A set for `exerciseId`, performed `daysAgo` days before NOW.
const performed = (exerciseId: string, daysAgo: number, overrides = {}) =>
  makeSet({ exercise_id: exerciseId, logged_at: NOW - daysAgo * DAY, ...overrides });

// Your list, in the order given.
const listOf = (...exercises: Exercise[]): ListItem[] =>
  exercises.map((exercise, i) => ({ exercise_id: exercise.id, sort_order: i }));

const namesIn = (groups: ReturnType<typeof buildBoard>, pattern: string) =>
  groups.find((g) => g.pattern === pattern)?.rows.map((r) => r.exercise.name);

describe('buildBoard', () => {
  it('always returns all six patterns, in PATTERNS order, even with nothing picked', () => {
    const groups = buildBoard([], [], NOW, []);
    expect(groups.map((g) => g.pattern)).toEqual([...PATTERNS]);
    expect(groups.every((g) => g.rows.length === 0)).toBe(true);
  });

  it('shows a group for a pattern you have not picked for, so it can offer to add', () => {
    const squat = makeExercise({ name: 'Back Squat', pattern: 'squat' });
    const groups = buildBoard([squat], [], NOW, listOf(squat));
    expect(namesIn(groups, 'squat')).toEqual(['Back Squat']);
    expect(namesIn(groups, 'core')).toEqual([]);
  });

  it('shows only what you picked, not the whole catalogue', () => {
    const picked = makeExercise({ id: 'a', name: 'Picked' });
    const ignored = makeExercise({ id: 'b', name: 'Not picked' });
    expect(namesIn(buildBoard([picked, ignored], [], NOW, listOf(picked)), 'squat')).toEqual(['Picked']);
  });

  it('keeps your order, not the order the rows came back in', () => {
    const a = makeExercise({ id: 'a', name: 'A' });
    const b = makeExercise({ id: 'b', name: 'B' });
    const c = makeExercise({ id: 'c', name: 'C' });
    const list = [
      { exercise_id: 'c', sort_order: 0 },
      { exercise_id: 'a', sort_order: 1 },
      { exercise_id: 'b', sort_order: 2 },
    ];
    expect(namesIn(buildBoard([a, b, c], [], NOW, list), 'squat')).toEqual(['C', 'A', 'B']);
    // The same list shuffled, and the exercises shuffled, give the same board.
    expect(namesIn(buildBoard([b, c, a], [], NOW, [...list].reverse()), 'squat')).toEqual(['C', 'A', 'B']);
  });

  it('never reorders by recency: the most recently performed stays where you put it', () => {
    const first = makeExercise({ id: 'a', name: 'First' });
    const second = makeExercise({ id: 'b', name: 'Second' });
    const logs = [performed(first.id, 30), performed(second.id, 0)];
    const groups = buildBoard([first, second], logs, NOW, listOf(first, second));
    expect(namesIn(groups, 'squat')).toEqual(['First', 'Second']);
  });

  it('logging does not move a row: the same list gives the same order before and after', () => {
    const a = makeExercise({ id: 'a', name: 'A' });
    const b = makeExercise({ id: 'b', name: 'B' });
    const list = listOf(a, b);
    const before = buildBoard([a, b], [performed(a.id, 5)], NOW, list);
    const after = buildBoard([a, b], [performed(a.id, 5), performed(b.id, 0)], NOW, list);
    expect(namesIn(before, 'squat')).toEqual(namesIn(after, 'squat'));
    // Only the row's own values change.
    expect(after[0].rows[1].daysSince).toBe(0);
  });

  it('sorts by sort_order, whatever the numbers are', () => {
    const a = makeExercise({ id: 'a', name: 'A' });
    const b = makeExercise({ id: 'b', name: 'B' });
    const list = [
      { exercise_id: 'a', sort_order: 40 },
      { exercise_id: 'b', sort_order: 7 },
    ];
    expect(namesIn(buildBoard([a, b], [], NOW, list), 'squat')).toEqual(['B', 'A']);
  });

  it('breaks an exact tie in sort_order by exercise id, independent of input order', () => {
    const x = makeExercise({ id: 'x', name: 'X' });
    const y = makeExercise({ id: 'y', name: 'Y' });
    const list = [
      { exercise_id: 'y', sort_order: 3 },
      { exercise_id: 'x', sort_order: 3 },
    ];
    expect(namesIn(buildBoard([x, y], [], NOW, list), 'squat')).toEqual(['X', 'Y']);
    expect(namesIn(buildBoard([y, x], [], NOW, [...list].reverse()), 'squat')).toEqual(['X', 'Y']);
  });

  it('groups by the exercise pattern, keeping your order within each group', () => {
    const squatA = makeExercise({ id: 's1', name: 'Squat A', pattern: 'squat' });
    const squatB = makeExercise({ id: 's2', name: 'Squat B', pattern: 'squat' });
    const push = makeExercise({ id: 'p1', name: 'Push', pattern: 'push' });
    const groups = buildBoard([squatA, squatB, push], [], NOW, listOf(squatB, push, squatA));
    expect(namesIn(groups, 'squat')).toEqual(['Squat B', 'Squat A']);
    expect(namesIn(groups, 'push')).toEqual(['Push']);
  });

  it('skips a listed exercise that is archived, or that is not on this device', () => {
    const kept = makeExercise({ id: 'a', name: 'Kept' });
    const archived = makeExercise({ id: 'b', name: 'Archived', archived: true });
    const list = [...listOf(kept, archived), { exercise_id: 'ghost', sort_order: 9 }];
    expect(namesIn(buildBoard([kept, archived], [], NOW, list), 'squat')).toEqual(['Kept']);
  });

  it('shows an exercise listed twice only once, at its first position', () => {
    const a = makeExercise({ id: 'a', name: 'A' });
    const b = makeExercise({ id: 'b', name: 'B' });
    const list = [
      { exercise_id: 'a', sort_order: 0 },
      { exercise_id: 'b', sort_order: 1 },
      { exercise_id: 'a', sort_order: 2 },
    ];
    expect(namesIn(buildBoard([a, b], [], NOW, list), 'squat')).toEqual(['A', 'B']);
  });

  it('shows the last working set and the days since any set', () => {
    const ex = makeExercise({ name: 'Bench' });
    const working = performed(ex.id, 5, { weight: 80 });
    const newerWarmup = performed(ex.id, 2, { kind: 'warmup', weight: 40 });
    const newerDrop = performed(ex.id, 1, { kind: 'drop', weight: 60 });
    const [row] = buildBoard([ex], [newerDrop, working, newerWarmup], NOW, listOf(ex))[0].rows;
    expect(row.lastSet).toBe(working);
    expect(row.daysSince).toBe(1); // any kind of set counts as performing it
  });

  it('gives a never-performed exercise no lastSet and no daysSince, and still shows it', () => {
    const never = makeExercise({ name: 'Never' });
    const [row] = buildBoard([never], [], NOW, listOf(never))[0].rows;
    expect(row.lastSet).toBeNull();
    expect(row.daysSince).toBeNull();
  });

  it('ignores logs for other exercises', () => {
    const mine = makeExercise({ id: 'a', name: 'Mine' });
    const other = makeExercise({ id: 'b', name: 'Other' });
    const [row] = buildBoard([mine], [performed(other.id, 1)], NOW, listOf(mine))[0].rows;
    expect(row.lastSet).toBeNull();
    expect(row.daysSince).toBeNull();
  });

  it('does not mutate its inputs', () => {
    const exercises = [makeExercise({ id: 'a', name: 'B' }), makeExercise({ id: 'b', name: 'A' })];
    const logs = [performed('a', 3)];
    const list = [
      { exercise_id: 'b', sort_order: 5 },
      { exercise_id: 'a', sort_order: 1 },
    ];
    const before = structuredClone({ exercises, logs, list });
    buildBoard(exercises, logs, NOW, list);
    expect({ exercises, logs, list }).toEqual(before);
  });
});
