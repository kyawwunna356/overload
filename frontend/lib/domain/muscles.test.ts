import { describe, expect, it } from 'vitest';
import { catalogueExercises } from '../seed';
import { MUSCLES, muscleBalance, muscleOf, topMuscle, type Muscle, type MuscleBalance } from './muscles';
import { makeExercise, makeSet } from './test-utils';

describe('muscleOf', () => {
  // Every exercise the app offers, and the group it counts toward. A new catalogue entry fails
  // here until it's placed, so nothing lands on the star by accident.
  const EXPECTED: Record<Muscle, string[]> = {
    chest: [
      'Bench Press', 'Incline Bench Press', 'Close-Grip Bench Press', 'Dumbbell Bench Press',
      'Incline Dumbbell Press', 'Machine Chest Press', 'Cable Fly', 'Pec Deck', 'Dips', 'Push-Up',
    ],
    back: [
      'Barbell Row', 'T-Bar Row', 'Dumbbell Row', 'Chest-Supported Row', 'Seated Cable Row',
      'Inverted Row', 'Pull-Up', 'Chin-Up', 'Lat Pulldown', 'Straight-Arm Pulldown', 'Barbell Shrug',
    ],
    legs: [
      'Back Squat', 'Front Squat', 'Box Squat', 'Smith Machine Squat', 'Hack Squat', 'Leg Press',
      'Bulgarian Split Squat', 'Walking Lunge', 'Step-Up', 'Goblet Squat', 'Leg Extension',
      'Pistol Squat', 'Deadlift', 'Sumo Deadlift', 'Trap Bar Deadlift', 'Romanian Deadlift',
      'Single-Leg RDL', 'Good Morning', 'Hip Thrust', 'Kettlebell Swing', 'Cable Pull-Through',
      'Glute-Ham Raise', 'Back Extension', 'Leg Curl', 'Calf Raise', 'Seated Calf Raise',
    ],
    shoulders: [
      'Overhead Press', 'Dumbbell Shoulder Press', 'Landmine Press', 'Lateral Raise', 'Front Raise',
      'Rear Delt Fly', 'Upright Row', 'Face Pull',
    ],
    arms: [
      'Dumbbell Curl', 'Barbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl',
      'Triceps Pushdown', 'Overhead Triceps Extension', 'Skullcrusher',
    ],
    core: [
      'Cable Crunch', 'Hanging Leg Raise', 'Toes-to-Bar', 'Decline Sit-Up', 'Russian Twist',
      'Pallof Press', 'Ab Wheel', 'Plank', 'Side Plank', 'Dead Bug',
    ],
  };

  it('places every catalogue exercise in the expected group', () => {
    const placed: Record<string, Muscle> = {};
    for (const exercise of catalogueExercises(0)) placed[exercise.name] = muscleOf(exercise);
    const expected: Record<string, Muscle> = {};
    for (const muscle of MUSCLES) for (const name of EXPECTED[muscle]) expected[name] = muscle;
    expect(placed).toEqual(expected);
  });

  it('falls back to the pattern for a name it has never seen', () => {
    expect(muscleOf({ name: 'Something New', pattern: 'pull' })).toBe('back');
    expect(muscleOf({ name: 'Something New', pattern: 'accessory' })).toBe('arms');
  });
});

describe('muscleBalance', () => {
  const squat = makeExercise({ name: 'Back Squat', pattern: 'squat' });
  const press = makeExercise({ name: 'Overhead Press', pattern: 'push' });

  it('counts working sets per group', () => {
    const balance = muscleBalance([
      { exercise: squat, sets: [makeSet(), makeSet(), makeSet()] },
      { exercise: press, sets: [makeSet(), makeSet()] },
    ]);
    expect(balance).toEqual({ chest: 0, back: 0, legs: 3, shoulders: 2, arms: 0, core: 0 });
  });

  it('leaves out warmup, drop and failure sets', () => {
    const balance = muscleBalance([
      {
        exercise: squat,
        sets: [
          makeSet({ kind: 'warmup' }),
          makeSet({ kind: 'working' }),
          makeSet({ kind: 'drop' }),
          makeSet({ kind: 'failure' }),
        ],
      },
    ]);
    expect(balance.legs).toBe(1);
  });

  it('skips an exercise missing from this device', () => {
    const balance = muscleBalance([{ exercise: null, sets: [makeSet(), makeSet()] }]);
    expect(Object.values(balance).every((count) => count === 0)).toBe(true);
  });
});

describe('topMuscle', () => {
  const balance = (counts: Partial<MuscleBalance>): MuscleBalance => ({
    chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, core: 0, ...counts,
  });

  it('is the group with the most working sets', () => {
    expect(topMuscle(balance({ back: 4, legs: 6, core: 2 }))).toBe('legs');
  });

  it('breaks a tie by the order of the groups', () => {
    expect(topMuscle(balance({ core: 3, back: 3 }))).toBe('back');
  });

  it('is null when nothing counted', () => {
    expect(topMuscle(balance({}))).toBeNull();
  });
});
