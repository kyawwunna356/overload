import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import { makeExercise, makeSet } from './test-utils';
import type { Exercise } from './types';

const DAY = 86_400_000;
const NOW = 100 * DAY;

// A set for `exerciseId`, performed `daysAgo` days before NOW.
const performed = (exerciseId: string, daysAgo: number, overrides = {}) =>
  makeSet({ exercise_id: exerciseId, logged_at: NOW - daysAgo * DAY, ...overrides });

const namesIn = (groups: ReturnType<typeof buildBoard>, pattern: string) =>
  groups.find((g) => g.pattern === pattern)?.rows.map((r) => r.exercise.name);

describe('buildBoard', () => {
  it('returns no groups when there are no exercises', () => {
    expect(buildBoard([], [], NOW)).toEqual([]);
  });

  it('groups in pattern order regardless of input order', () => {
    const exercises = [
      makeExercise({ name: 'Plank', pattern: 'core' }),
      makeExercise({ name: 'Row', pattern: 'pull' }),
      makeExercise({ name: 'Squat', pattern: 'squat' }),
      makeExercise({ name: 'Bench', pattern: 'push' }),
    ];
    const groups = buildBoard(exercises, [], NOW);
    expect(groups.map((g) => g.pattern)).toEqual(['squat', 'push', 'pull', 'core']);
  });

  it('omits patterns that have no exercises', () => {
    const groups = buildBoard([makeExercise({ pattern: 'hinge' })], [], NOW);
    expect(groups.map((g) => g.pattern)).toEqual(['hinge']);
  });

  it('excludes archived exercises, and drops a group that becomes empty', () => {
    const exercises = [
      makeExercise({ name: 'Kept', pattern: 'squat' }),
      makeExercise({ name: 'Gone', pattern: 'core', archived: true }),
    ];
    const groups = buildBoard(exercises, [], NOW);
    expect(groups.map((g) => g.pattern)).toEqual(['squat']);
    expect(namesIn(groups, 'squat')).toEqual(['Kept']);
  });

  it('sorts most recently performed first within a group', () => {
    const a = makeExercise({ name: 'A' });
    const b = makeExercise({ name: 'B' });
    const c = makeExercise({ name: 'C' });
    const logs = [performed(a.id, 6), performed(b.id, 1), performed(c.id, 3)];
    expect(namesIn(buildBoard([a, b, c], logs, NOW), 'squat')).toEqual(['B', 'C', 'A']);
  });

  it('puts never-performed exercises last, ordered by name among themselves', () => {
    const done = makeExercise({ name: 'Done' });
    const zeta = makeExercise({ name: 'Zeta' });
    const alpha = makeExercise({ name: 'Alpha' });
    const groups = buildBoard([zeta, done, alpha], [performed(done.id, 20)], NOW);
    expect(namesIn(groups, 'squat')).toEqual(['Done', 'Alpha', 'Zeta']);
  });

  it('breaks exact ties by name, then id, independent of input order', () => {
    const x = makeExercise({ id: 'x', name: 'Same' });
    const y = makeExercise({ id: 'y', name: 'Same' });
    const first = makeExercise({ id: 'z', name: 'First' });
    const logs = [performed(x.id, 2), performed(y.id, 2), performed(first.id, 2)];
    const ids = (input: Exercise[]) =>
      buildBoard(input, logs, NOW)[0].rows.map((r) => r.exercise.id);
    expect(ids([x, y, first])).toEqual(['z', 'x', 'y']);
    expect(ids([first, y, x])).toEqual(['z', 'x', 'y']);
  });

  it("reports each row's last working set and days since", () => {
    const ex = makeExercise({ name: 'Back Squat' });
    const working = performed(ex.id, 4, { weight: 100, reps: 5 });
    const [row] = buildBoard([ex], [working], NOW)[0].rows;
    expect(row.lastSet).toBe(working);
    expect(row.daysSince).toBe(4);
  });

  it('shows the last working set even when a newer warmup, drop or failure exists', () => {
    const ex = makeExercise({ name: 'Bench' });
    const working = performed(ex.id, 5, { weight: 80 });
    const newerWarmup = performed(ex.id, 2, { kind: 'warmup', weight: 40 });
    const newerDrop = performed(ex.id, 1, { kind: 'drop', weight: 60 });
    const [row] = buildBoard([ex], [newerDrop, working, newerWarmup], NOW)[0].rows;
    expect(row.lastSet).toBe(working);
    expect(row.daysSince).toBe(1); // still counts as performed by the newest set of any kind
  });

  it('gives an exercise with only non-working sets no lastSet but still ranks it by recency', () => {
    const warmupOnly = makeExercise({ name: 'Warmup only' });
    const never = makeExercise({ name: 'Never' });
    const older = makeExercise({ name: 'Older' });
    const logs = [
      performed(warmupOnly.id, 2, { kind: 'warmup' }),
      performed(older.id, 9),
    ];
    const rows = buildBoard([never, older, warmupOnly], logs, NOW)[0].rows;
    expect(rows.map((r) => r.exercise.name)).toEqual(['Warmup only', 'Older', 'Never']);
    expect(rows[0].lastSet).toBeNull();
    expect(rows[0].daysSince).toBe(2);
  });

  it('ignores logs for other exercises', () => {
    const mine = makeExercise({ name: 'Mine' });
    const other = makeExercise({ name: 'Other' });
    const [row] = buildBoard([mine], [performed(other.id, 1)], NOW)[0].rows;
    expect(row.lastSet).toBeNull();
    expect(row.daysSince).toBeNull();
  });

  it('does not mutate its inputs', () => {
    const exercises = [makeExercise({ name: 'B' }), makeExercise({ name: 'A' })];
    const logs = [performed(exercises[0].id, 3)];
    const exercisesBefore = structuredClone(exercises);
    const logsBefore = structuredClone(logs);
    buildBoard(exercises, logs, NOW);
    expect(exercises).toEqual(exercisesBefore);
    expect(logs).toEqual(logsBefore);
  });
});
