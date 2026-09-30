import { describe, expect, it } from 'vitest';
import { exerciseIndex, exerciseRecords } from './exerciseHistory';
import { makeExercise, makeSet } from './test-utils';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;

const bench = makeExercise({ name: 'Bench Press', pattern: 'push' });
const squat = makeExercise({ name: 'back squat', pattern: 'squat' });
const deadlift = makeExercise({ name: 'Deadlift', pattern: 'hinge' });
const curl = makeExercise({ name: 'Curl', pattern: 'accessory', archived: true });

const set = (exerciseId: string, daysAgo: number, overrides = {}) =>
  makeSet({ exercise_id: exerciseId, logged_at: NOW - daysAgo * DAY, ...overrides });

describe('exerciseIndex', () => {
  const latest = [
    set(bench.id, 4, { weight: 82.5 }),
    set(squat.id, 2, { weight: 102.5 }),
    set(curl.id, 30, { weight: 15 }),
  ];

  it('lists only lifts with a set, A to Z whatever the case', () => {
    const rows = exerciseIndex([deadlift, bench, curl, squat], latest, NOW);
    expect(rows.map((row) => row.exercise.name)).toEqual(['back squat', 'Bench Press', 'Curl']);
  });

  it('keeps an archived lift: the sets happened', () => {
    expect(exerciseIndex([curl], latest, NOW)).toHaveLength(1);
  });

  it('gives the last working set and the days since any set', () => {
    const warmupLater = set(bench.id, 1, { kind: 'warmup', weight: 40 });
    const [row] = exerciseIndex([bench], [...latest, warmupLater], NOW);
    expect(row.set?.weight).toBe(82.5);
    expect(row.daysAgo).toBe(1);
  });

  it('shows a lift with only warmups, with no set', () => {
    const [row] = exerciseIndex([deadlift], [set(deadlift.id, 3, { kind: 'warmup' })], NOW);
    expect(row).toMatchObject({ set: null, daysAgo: 3 });
  });

  it('narrows by a search that ignores case and surrounding spaces', () => {
    const names = (query: string) => exerciseIndex([bench, squat, curl], latest, NOW, query).map((row) => row.exercise.name);
    expect(names('  PRESS ')).toEqual(['Bench Press']);
    expect(names('s')).toEqual(['back squat', 'Bench Press']);
    expect(names('row')).toEqual([]);
  });
});

describe('exerciseRecords', () => {
  it('has nothing with no working sets', () => {
    expect(exerciseRecords([set(bench.id, 1, { kind: 'warmup' })])).toEqual({
      heaviest: null,
      bestE1rm: null,
      mostReps: null,
    });
  });

  it('finds the heaviest set, the best estimate and the most reps, ignoring other kinds', () => {
    const heavy = set(bench.id, 20, { weight: 100, reps: 3 });
    const strong = set(bench.id, 10, { weight: 90, reps: 8 }); // e1RM 114 beats 100 × 3's 110
    const many = set(bench.id, 5, { weight: 60, reps: 12 });
    const drop = set(bench.id, 1, { kind: 'drop', weight: 120, reps: 20 });
    const records = exerciseRecords([many, drop, heavy, strong]);
    expect(records.heaviest).toEqual({ set: heavy, value: 100 });
    expect(records.bestE1rm?.set).toBe(strong);
    expect(records.bestE1rm?.value).toBeCloseTo(114);
    expect(records.mostReps).toEqual({ set: many, value: 12 });
  });

  it('breaks a heaviest tie by reps, and an exact tie by the earlier set', () => {
    const first = set(bench.id, 20, { weight: 100, reps: 5 });
    const again = set(bench.id, 10, { weight: 100, reps: 5 });
    const more = set(bench.id, 15, { weight: 100, reps: 6 });
    expect(exerciseRecords([again, first]).heaviest?.set).toBe(first);
    expect(exerciseRecords([again, first, more]).heaviest?.set).toBe(more);
  });

  it('breaks a most-reps tie by the heavier set', () => {
    const light = set(bench.id, 20, { weight: 40, reps: 12 });
    const heavier = set(bench.id, 10, { weight: 50, reps: 12 });
    expect(exerciseRecords([light, heavier]).mostReps?.set).toBe(heavier);
  });

  it('leaves out the estimate for a bodyweight lift', () => {
    const records = exerciseRecords([set(bench.id, 3, { weight: 0, reps: 15 })]);
    expect(records.bestE1rm).toBeNull();
    expect(records.mostReps?.value).toBe(15);
  });
});
