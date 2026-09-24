import type { Exercise, Pattern, SetLog } from './types';

// Which muscle group a session leaned on — the star on the recap. Each exercise counts toward one
// group, derived from its movement pattern plus the names that don't follow their pattern (a
// shoulder press is a push but trains shoulders; a calf raise is an accessory but trains legs).
// Derived every time, never stored (Hard Rule 1). Pure: no clock, no I/O (Hard Rule 6).
//
// One session's shape only. Nothing here compares sessions or says a group was missed.

export const MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const;
export type Muscle = (typeof MUSCLES)[number];

export type MuscleBalance = Record<Muscle, number>;

const BY_PATTERN: Record<Pattern, Muscle> = {
  squat: 'legs',
  hinge: 'legs',
  push: 'chest',
  pull: 'back',
  accessory: 'arms',
  core: 'core',
};

// The exceptions, by catalogue name. Everything else follows its pattern.
const BY_NAME: Readonly<Record<string, Muscle>> = {
  'Overhead Press': 'shoulders',
  'Dumbbell Shoulder Press': 'shoulders',
  'Landmine Press': 'shoulders',
  'Lateral Raise': 'shoulders',
  'Front Raise': 'shoulders',
  'Rear Delt Fly': 'shoulders',
  'Upright Row': 'shoulders',
  'Face Pull': 'shoulders',
  'Calf Raise': 'legs',
  'Seated Calf Raise': 'legs',
  'Leg Curl': 'legs',
};

export function muscleOf(exercise: Pick<Exercise, 'name' | 'pattern'>): Muscle {
  return BY_NAME[exercise.name] ?? BY_PATTERN[exercise.pattern];
}

// Working sets per group. Warmups, drops and failure sets aren't what a session leaned on, so they
// don't count; an exercise missing from this device can't be placed, so its sets are skipped.
export function muscleBalance(
  groups: readonly {
    exercise: Pick<Exercise, 'name' | 'pattern'> | null;
    sets: readonly SetLog[];
  }[],
): MuscleBalance {
  const balance: MuscleBalance = { chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, core: 0 };
  for (const group of groups) {
    if (group.exercise === null) continue;
    const muscle = muscleOf(group.exercise);
    for (const set of group.sets) if (set.kind === 'working') balance[muscle] += 1;
  }
  return balance;
}

// The group with the most working sets; ties go to the earlier one in MUSCLES. Null when nothing
// counted, which is also when the star has nothing to draw.
export function topMuscle(balance: MuscleBalance): Muscle | null {
  let top: Muscle | null = null;
  for (const muscle of MUSCLES) {
    if (balance[muscle] > 0 && (top === null || balance[muscle] > balance[top])) top = muscle;
  }
  return top;
}
