import { describe, expect, it } from 'vitest';
import { duplicateExercises, isEmptyRepair, repairDuplicates } from './repair';
import { makeExercise, makeSet } from './test-utils';
import type { Template, TemplateItem } from './types';

const NOW = 9_000;

const list = (id: string, is_default = true): Template => ({
  id,
  user_id: 'local',
  name: 'My Exercises',
  is_default,
  updated_at: 1,
});

const pick = (id: string, template_id: string, exercise_id: string, sort_order: number, pattern: TemplateItem['pattern'] = 'squat'): TemplateItem => ({
  id,
  user_id: 'local',
  template_id,
  exercise_id,
  pattern,
  sort_order,
  updated_at: 1,
});

// Two devices' catalogues: "a-" ids sort before "b-" ids, so device A's copies are kept.
const squatA = makeExercise({ id: 'a-squat', name: 'Back Squat' });
const squatB = makeExercise({ id: 'b-squat', name: 'Back Squat' });
const pressA = makeExercise({ id: 'a-press', name: 'Leg Press' });
const pressB = makeExercise({ id: 'b-press', name: 'Leg Press' });
const lungeB = makeExercise({ id: 'b-lunge', name: 'Walking Lunge' });

describe('duplicateExercises', () => {
  it('maps every extra copy to the lowest id with that name', () => {
    expect(duplicateExercises([squatB, pressA, squatA, pressB, lungeB])).toEqual(
      new Map([
        ['b-squat', 'a-squat'],
        ['b-press', 'a-press'],
      ]),
    );
  });

  it('matches names regardless of case and spacing', () => {
    const shout = makeExercise({ id: 'b-x', name: '  back squat ' });
    expect(duplicateExercises([squatA, shout])).toEqual(new Map([['b-x', 'a-squat']]));
  });

  it('ignores archived exercises', () => {
    expect(duplicateExercises([squatA, { ...squatB, archived: true }])).toEqual(new Map());
  });
});

describe('repairDuplicates', () => {
  it('does nothing when there is nothing to merge', () => {
    const repair = repairDuplicates(
      { exercises: [squatA, pressA], templates: [list('a-list')], items: [pick('i1', 'a-list', 'a-squat', 0)], sets: [] },
      NOW,
    );
    expect(isEmptyRepair(repair)).toBe(true);
  });

  it('archives the extra copies and moves their sets to the kept twin', () => {
    const set = makeSet({ exercise_id: 'b-squat', logged_at: 5 });
    const repair = repairDuplicates({ exercises: [squatA, squatB], templates: [], items: [], sets: [set] }, NOW);
    expect(repair.exercises).toEqual([{ ...squatB, archived: true, updated_at: NOW }]);
    expect(repair.sets).toEqual([{ ...set, exercise_id: 'a-squat', updated_at: NOW }]);
  });

  it('keeps the lowest-id default list and merges the others into it, in order', () => {
    // The situation on the user's account: the kept list (a) has 1 pick, the other (b) has 3.
    const repair = repairDuplicates(
      {
        exercises: [squatA, squatB, pressA, pressB, lungeB],
        templates: [list('b-list'), list('a-list')],
        items: [
          pick('a1', 'a-list', 'a-squat', 0),
          pick('b1', 'b-list', 'b-press', 0),
          pick('b2', 'b-list', 'b-squat', 1),
          pick('b3', 'b-list', 'b-lunge', 2),
        ],
        sets: [],
      },
      NOW,
    );
    expect(repair.templates).toEqual([{ ...list('b-list'), is_default: false, updated_at: NOW }]);
    // Squat was already on the kept list, so b2 is a duplicate and goes.
    expect(repair.itemDeletes.map((i) => i.id)).toEqual(['b2']);
    expect(repair.itemPuts.map((i) => [i.id, i.template_id, i.exercise_id, i.sort_order])).toEqual([
      ['b1', 'a-list', 'a-press', 1],
      ['b3', 'a-list', 'b-lunge', 2],
    ]);
  });

  it('numbers positions per pattern, so each group keeps its own order', () => {
    const bench = makeExercise({ id: 'b-bench', name: 'Bench Press', pattern: 'push' });
    const repair = repairDuplicates(
      {
        exercises: [squatA, bench],
        templates: [list('a-list'), list('b-list')],
        items: [pick('a1', 'a-list', 'a-squat', 0), pick('b1', 'b-list', 'b-bench', 4, 'push')],
        sets: [],
      },
      NOW,
    );
    expect(repair.itemPuts.map((i) => [i.id, i.template_id, i.sort_order])).toEqual([['b1', 'a-list', 0]]);
  });

  it('removes a duplicate pick within one list after merging twins', () => {
    const repair = repairDuplicates(
      {
        exercises: [squatA, squatB],
        templates: [list('a-list')],
        items: [pick('a1', 'a-list', 'a-squat', 0), pick('a2', 'a-list', 'b-squat', 1)],
        sets: [],
      },
      NOW,
    );
    expect(repair.itemDeletes.map((i) => i.id)).toEqual(['a2']);
    expect(repair.itemPuts).toEqual([]);
  });

  it('leaves lists that are not defaults alone', () => {
    const repair = repairDuplicates(
      { exercises: [squatA], templates: [list('a-list'), list('z-old', false)], items: [pick('z1', 'z-old', 'a-squat', 0)], sets: [] },
      NOW,
    );
    expect(isEmptyRepair(repair)).toBe(true);
  });

  it('is idempotent: repairing the repaired rows changes nothing', () => {
    const input = {
      exercises: [squatA, squatB, pressB],
      templates: [list('a-list'), list('b-list')],
      items: [pick('a1', 'a-list', 'a-squat', 0), pick('b1', 'b-list', 'b-squat', 0), pick('b2', 'b-list', 'b-press', 1)],
      sets: [makeSet({ exercise_id: 'b-squat' })],
    };
    const first = repairDuplicates(input, NOW);
    const apply = <T extends { id: string }>(rows: readonly T[], puts: readonly T[], deletes: readonly T[] = []) => {
      const gone = new Set(deletes.map((d) => d.id));
      const put = new Map(puts.map((p) => [p.id, p]));
      return rows.filter((r) => !gone.has(r.id)).map((r) => put.get(r.id) ?? r);
    };
    const second = repairDuplicates(
      {
        exercises: apply(input.exercises, first.exercises),
        templates: apply(input.templates, first.templates),
        items: apply(input.items, first.itemPuts, first.itemDeletes),
        sets: apply(input.sets, first.sets),
      },
      NOW + 1,
    );
    expect(isEmptyRepair(second)).toBe(true);
  });

  it('agrees whatever order the rows arrive in', () => {
    const exercises = [squatA, squatB, pressA, pressB];
    const templates = [list('a-list'), list('b-list')];
    const items = [pick('a1', 'a-list', 'a-squat', 0), pick('b1', 'b-list', 'b-press', 0)];
    const one = repairDuplicates({ exercises, templates, items, sets: [] }, NOW);
    const two = repairDuplicates(
      { exercises: [...exercises].reverse(), templates: [...templates].reverse(), items: [...items].reverse(), sets: [] },
      NOW,
    );
    expect(two).toEqual(one);
  });
});
