import { describe, expect, it } from 'vitest';
import { coverage } from './coverage';
import { makeExercise, makeSet } from './test-utils';
import { PATTERNS } from './types';

const squat = makeExercise({ name: 'Back Squat', pattern: 'squat' });
const hinge = makeExercise({ name: 'Deadlift', pattern: 'hinge' });
const push = makeExercise({ name: 'Bench', pattern: 'push' });
const pull = makeExercise({ name: 'Row', pattern: 'pull' });
const accessory = makeExercise({ name: 'Curl', pattern: 'accessory' });
const core = makeExercise({ name: 'Crunch', pattern: 'core' });
const all = [squat, hinge, push, pull, accessory, core];

const did = (exerciseId: string, minute = 0, overrides = {}) =>
  makeSet({ exercise_id: exerciseId, logged_at: 1_000_000 + minute * 60_000, ...overrides });

describe('coverage', () => {
  it('covers nothing when there are no sets', () => {
    expect(coverage([], all)).toEqual({
      squat: false,
      hinge: false,
      push: false,
      pull: false,
      accessory: false,
      core: false,
    });
  });

  it('always has a key for every pattern', () => {
    expect(Object.keys(coverage([], all)).sort()).toEqual([...PATTERNS].sort());
    expect(Object.keys(coverage([did(squat.id)], [])).sort()).toEqual([...PATTERNS].sort());
  });

  it('covers only the pattern of the exercise that was done', () => {
    const result = coverage([did(push.id)], all);
    expect(result.push).toBe(true);
    expect(PATTERNS.filter((pattern) => result[pattern])).toEqual(['push']);
  });

  it('covers a pattern once however many sets or exercises were done in it', () => {
    const otherSquat = makeExercise({ name: 'Leg Press', pattern: 'squat' });
    const result = coverage([did(squat.id, 0), did(squat.id, 3), did(otherSquat.id, 6)], [...all, otherSquat]);
    expect(PATTERNS.filter((pattern) => result[pattern])).toEqual(['squat']);
  });

  it('covers all six when each pattern was trained', () => {
    const logs = all.map((exercise, i) => did(exercise.id, i));
    expect(Object.values(coverage(logs, all)).every(Boolean)).toBe(true);
  });

  it('counts every kind of set, warmups included', () => {
    for (const kind of ['warmup', 'working', 'drop', 'failure'] as const) {
      expect(coverage([did(hinge.id, 0, { kind })], all).hinge).toBe(true);
    }
  });

  it('ignores a set whose exercise is not in the list', () => {
    const result = coverage([did('ex-unknown')], all);
    expect(Object.values(result).some(Boolean)).toBe(false);
  });

  it('still counts an archived exercise, because the set happened', () => {
    const retired = makeExercise({ name: 'Old Pull', pattern: 'pull', archived: true });
    expect(coverage([did(retired.id)], [retired]).pull).toBe(true);
  });

  it('does not depend on the order of the sets or the exercises', () => {
    const logs = [did(core.id, 2), did(squat.id, 0), did(pull.id, 1)];
    expect(coverage([...logs].reverse(), [...all].reverse())).toEqual(coverage(logs, all));
  });

  it('does not mutate its inputs', () => {
    const logs = [did(squat.id), did(push.id, 1)];
    const logsBefore = structuredClone(logs);
    const exercisesBefore = structuredClone(all);
    coverage(logs, all);
    expect(logs).toEqual(logsBefore);
    expect(all).toEqual(exercisesBefore);
  });
});
