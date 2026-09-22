import { LOCAL_USER_ID } from './constants';
import {
  type Exercise,
  type Pattern,
  type SetKind,
  type SetLog,
  type Template,
  type TemplateItem,
} from './domain/types';
import { newId } from './uuid';

// The exercise catalogue, plus ~6 weeks of realistic full-body training so prefill and the
// board can be judged by eye. Pure: a function of `now` and a fixed RNG seed, so a reset
// always produces the same-looking history. `session_id` stays null — sessions are derived
// by the gap rule.
//
// A fresh install picks NOTHING: the default template is created empty, so every pattern
// group starts empty and the exercises you add are the only ones the board shows.

export type SeedData = {
  exercises: Exercise[];
  templates: Template[];
  templateItems: TemplateItem[];
  setLogs: SetLog[];
};

type CatalogueEntry = {
  name: string;
  pattern: Pattern;
  rest: number; // default_rest_sec
  start: number; // starting working weight (kg); 0 = bodyweight
  step: number; // progression increment (kg); 0 = progresses by reps
};

// Every exercise the app knows about — what the picker offers. Nothing here is "yours"
// until you add it to your list (template_items); the board shows only what you picked.
// A new exercise can be appended at any time: the Dexie v2 migration adds the ones a device
// hasn't got yet, matching on name.
const CATALOGUE = {
  back_squat: { name: 'Back Squat', pattern: 'squat', rest: 180, start: 80, step: 2.5 },
  front_squat: { name: 'Front Squat', pattern: 'squat', rest: 180, start: 60, step: 2.5 },
  box_squat: { name: 'Box Squat', pattern: 'squat', rest: 180, start: 70, step: 2.5 },
  smith_squat: { name: 'Smith Machine Squat', pattern: 'squat', rest: 120, start: 60, step: 2.5 },
  hack_squat: { name: 'Hack Squat', pattern: 'squat', rest: 120, start: 80, step: 5 },
  leg_press: { name: 'Leg Press', pattern: 'squat', rest: 120, start: 140, step: 5 },
  bulgarian_split_squat: { name: 'Bulgarian Split Squat', pattern: 'squat', rest: 120, start: 16, step: 2 },
  walking_lunge: { name: 'Walking Lunge', pattern: 'squat', rest: 90, start: 20, step: 2 },
  step_up: { name: 'Step-Up', pattern: 'squat', rest: 90, start: 16, step: 2 },
  goblet_squat: { name: 'Goblet Squat', pattern: 'squat', rest: 90, start: 20, step: 2 },
  leg_extension: { name: 'Leg Extension', pattern: 'squat', rest: 75, start: 40, step: 2.5 },
  pistol_squat: { name: 'Pistol Squat', pattern: 'squat', rest: 90, start: 0, step: 0 },

  deadlift: { name: 'Deadlift', pattern: 'hinge', rest: 210, start: 100, step: 5 },
  sumo_deadlift: { name: 'Sumo Deadlift', pattern: 'hinge', rest: 210, start: 90, step: 5 },
  trap_bar_deadlift: { name: 'Trap Bar Deadlift', pattern: 'hinge', rest: 180, start: 100, step: 5 },
  romanian_deadlift: { name: 'Romanian Deadlift', pattern: 'hinge', rest: 150, start: 80, step: 2.5 },
  single_leg_rdl: { name: 'Single-Leg RDL', pattern: 'hinge', rest: 90, start: 16, step: 2 },
  good_morning: { name: 'Good Morning', pattern: 'hinge', rest: 120, start: 40, step: 2.5 },
  hip_thrust: { name: 'Hip Thrust', pattern: 'hinge', rest: 120, start: 90, step: 5 },
  kettlebell_swing: { name: 'Kettlebell Swing', pattern: 'hinge', rest: 75, start: 24, step: 4 },
  cable_pull_through: { name: 'Cable Pull-Through', pattern: 'hinge', rest: 60, start: 30, step: 2.5 },
  glute_ham_raise: { name: 'Glute-Ham Raise', pattern: 'hinge', rest: 90, start: 0, step: 0 },
  back_extension: { name: 'Back Extension', pattern: 'hinge', rest: 75, start: 10, step: 2.5 },

  bench_press: { name: 'Bench Press', pattern: 'push', rest: 180, start: 70, step: 2.5 },
  incline_bench_press: { name: 'Incline Bench Press', pattern: 'push', rest: 150, start: 55, step: 2.5 },
  close_grip_bench: { name: 'Close-Grip Bench Press', pattern: 'push', rest: 150, start: 60, step: 2.5 },
  db_bench_press: { name: 'Dumbbell Bench Press', pattern: 'push', rest: 120, start: 28, step: 2 },
  incline_db_press: { name: 'Incline Dumbbell Press', pattern: 'push', rest: 120, start: 24, step: 2 },
  machine_chest_press: { name: 'Machine Chest Press', pattern: 'push', rest: 90, start: 45, step: 5 },
  overhead_press: { name: 'Overhead Press', pattern: 'push', rest: 150, start: 42.5, step: 2.5 },
  db_shoulder_press: { name: 'Dumbbell Shoulder Press', pattern: 'push', rest: 120, start: 20, step: 2 },
  landmine_press: { name: 'Landmine Press', pattern: 'push', rest: 90, start: 25, step: 2.5 },
  cable_fly: { name: 'Cable Fly', pattern: 'push', rest: 60, start: 15, step: 2.5 },
  pec_deck: { name: 'Pec Deck', pattern: 'push', rest: 60, start: 35, step: 5 },
  dips: { name: 'Dips', pattern: 'push', rest: 120, start: 0, step: 0 },
  push_up: { name: 'Push-Up', pattern: 'push', rest: 60, start: 0, step: 0 },

  barbell_row: { name: 'Barbell Row', pattern: 'pull', rest: 150, start: 60, step: 2.5 },
  t_bar_row: { name: 'T-Bar Row', pattern: 'pull', rest: 120, start: 45, step: 2.5 },
  db_row: { name: 'Dumbbell Row', pattern: 'pull', rest: 90, start: 30, step: 2 },
  chest_supported_row: { name: 'Chest-Supported Row', pattern: 'pull', rest: 90, start: 35, step: 2.5 },
  seated_cable_row: { name: 'Seated Cable Row', pattern: 'pull', rest: 90, start: 50, step: 2.5 },
  inverted_row: { name: 'Inverted Row', pattern: 'pull', rest: 75, start: 0, step: 0 },
  pull_up: { name: 'Pull-Up', pattern: 'pull', rest: 120, start: 0, step: 0 },
  chin_up: { name: 'Chin-Up', pattern: 'pull', rest: 120, start: 0, step: 0 },
  lat_pulldown: { name: 'Lat Pulldown', pattern: 'pull', rest: 90, start: 55, step: 2.5 },
  straight_arm_pulldown: { name: 'Straight-Arm Pulldown', pattern: 'pull', rest: 60, start: 25, step: 2.5 },
  face_pull: { name: 'Face Pull', pattern: 'pull', rest: 60, start: 20, step: 2.5 },
  shrug: { name: 'Barbell Shrug', pattern: 'pull', rest: 75, start: 60, step: 5 },

  bicep_curl: { name: 'Dumbbell Curl', pattern: 'accessory', rest: 75, start: 14, step: 2 },
  barbell_curl: { name: 'Barbell Curl', pattern: 'accessory', rest: 75, start: 25, step: 2.5 },
  hammer_curl: { name: 'Hammer Curl', pattern: 'accessory', rest: 75, start: 14, step: 2 },
  preacher_curl: { name: 'Preacher Curl', pattern: 'accessory', rest: 75, start: 20, step: 2.5 },
  cable_curl: { name: 'Cable Curl', pattern: 'accessory', rest: 60, start: 20, step: 2.5 },
  triceps_pushdown: { name: 'Triceps Pushdown', pattern: 'accessory', rest: 75, start: 25, step: 2.5 },
  overhead_triceps_ext: { name: 'Overhead Triceps Extension', pattern: 'accessory', rest: 75, start: 20, step: 2.5 },
  skullcrusher: { name: 'Skullcrusher', pattern: 'accessory', rest: 75, start: 25, step: 2.5 },
  lateral_raise: { name: 'Lateral Raise', pattern: 'accessory', rest: 60, start: 8, step: 1 },
  rear_delt_fly: { name: 'Rear Delt Fly', pattern: 'accessory', rest: 60, start: 8, step: 1 },
  front_raise: { name: 'Front Raise', pattern: 'accessory', rest: 60, start: 8, step: 1 },
  upright_row: { name: 'Upright Row', pattern: 'accessory', rest: 75, start: 25, step: 2.5 },
  leg_curl: { name: 'Leg Curl', pattern: 'accessory', rest: 75, start: 35, step: 2.5 },
  calf_raise: { name: 'Calf Raise', pattern: 'accessory', rest: 60, start: 60, step: 5 },
  seated_calf_raise: { name: 'Seated Calf Raise', pattern: 'accessory', rest: 60, start: 40, step: 5 },

  cable_crunch: { name: 'Cable Crunch', pattern: 'core', rest: 60, start: 30, step: 2.5 },
  hanging_leg_raise: { name: 'Hanging Leg Raise', pattern: 'core', rest: 60, start: 0, step: 0 },
  toes_to_bar: { name: 'Toes-to-Bar', pattern: 'core', rest: 75, start: 0, step: 0 },
  decline_sit_up: { name: 'Decline Sit-Up', pattern: 'core', rest: 60, start: 0, step: 0 },
  russian_twist: { name: 'Russian Twist', pattern: 'core', rest: 45, start: 10, step: 2 },
  pallof_press: { name: 'Pallof Press', pattern: 'core', rest: 60, start: 15, step: 2.5 },
  ab_wheel: { name: 'Ab Wheel', pattern: 'core', rest: 60, start: 0, step: 0 },
  plank: { name: 'Plank', pattern: 'core', rest: 60, start: 0, step: 0 },
  side_plank: { name: 'Side Plank', pattern: 'core', rest: 45, start: 0, step: 0 },
  dead_bug: { name: 'Dead Bug', pattern: 'core', rest: 45, start: 0, step: 0 },
} as const satisfies Record<string, CatalogueEntry>;

type Key = keyof typeof CATALOGUE;

type PlanEntry = {
  key: Key;
  sets: number;
  reps: number;
  warmup?: boolean; // two ramp-up sets before the working sets
  topRpe?: boolean; // record RPE on the last working set
  finisher?: 'drop' | 'failure'; // sometimes ends with a drop set / to-failure set
  weeks?: readonly [from: number, to: number]; // only in these weeks (inclusive)
  every?: readonly [n: number, offset: number]; // only when performed % n === offset
};

// Three rotating full-body days. Not every exercise appears every time, which
// is what gives the board a spread of staleness values.
const PLANS: readonly (readonly PlanEntry[])[] = [
  [
    { key: 'back_squat', sets: 3, reps: 5, warmup: true, topRpe: true },
    { key: 'bench_press', sets: 3, reps: 5, warmup: true, topRpe: true },
    { key: 'barbell_row', sets: 3, reps: 8 },
    { key: 'romanian_deadlift', sets: 3, reps: 8 },
    { key: 'lateral_raise', sets: 3, reps: 12, finisher: 'drop' },
    { key: 'cable_crunch', sets: 3, reps: 12 },
    { key: 'calf_raise', sets: 3, reps: 12, every: [2, 0] },
  ],
  [
    { key: 'deadlift', sets: 2, reps: 5, warmup: true, topRpe: true },
    { key: 'overhead_press', sets: 3, reps: 6, warmup: true, topRpe: true },
    { key: 'pull_up', sets: 3, reps: 8, finisher: 'failure' },
    { key: 'leg_press', sets: 3, reps: 10 },
    { key: 'bicep_curl', sets: 3, reps: 10, finisher: 'drop' },
    { key: 'hanging_leg_raise', sets: 3, reps: 10 },
    { key: 'leg_curl', sets: 3, reps: 12, every: [2, 1] },
  ],
  [
    // Front squat is dropped for split squats halfway through, leaving it stale.
    { key: 'front_squat', sets: 3, reps: 5, warmup: true, topRpe: true, weeks: [0, 2] },
    { key: 'bulgarian_split_squat', sets: 3, reps: 8, weeks: [3, 5] },
    { key: 'incline_db_press', sets: 3, reps: 10 },
    { key: 'lat_pulldown', sets: 3, reps: 10 },
    { key: 'hip_thrust', sets: 3, reps: 8, warmup: true },
    { key: 'triceps_pushdown', sets: 3, reps: 12, finisher: 'drop' },
    { key: 'face_pull', sets: 3, reps: 15 },
    { key: 'dips', sets: 3, reps: 8, finisher: 'failure', every: [2, 0] },
  ],
];

const SEED_WEEKS = 6;
const SESSIONS_PER_WEEK = 3;
const DAY_SLOTS = [1, 3, 5]; // days into each week that a session falls on
const SKIPPED = new Set([1 * SESSIONS_PER_WEEK + 1, 4 * SESSIONS_PER_WEEK + 2]); // life happens
const BAR_KG = 20;
const RNG_SEED = 20260920;

const SEC = 1000;
const DAY = 24 * 60 * 60 * SEC;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

// Every catalogue entry as an Exercise row. Used by the first-run seed and by the Dexie v2
// migration, which adds whichever of these a device hasn't got yet.
export function catalogueExercises(createdAt: number): Exercise[] {
  return Object.values(CATALOGUE).map((entry, i) => ({
    id: newId(createdAt + i),
    user_id: LOCAL_USER_ID,
    name: entry.name,
    pattern: entry.pattern,
    default_rest_sec: entry.rest,
    archived: false,
    updated_at: createdAt + i,
  }));
}

export function generateSeed(now: number): SeedData {
  const rng = mulberry32(RNG_SEED);
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const chance = (p: number) => rng() < p;

  const createdAt = now - (SEED_WEEKS * 7 + 1) * DAY;

  const exercises = catalogueExercises(createdAt);
  const idByKey = new Map<string, string>(
    Object.keys(CATALOGUE).map((key, i) => [key, exercises[i].id]),
  );
  const exerciseId = (key: string): string => {
    const id = idByKey.get(key);
    if (id === undefined) throw new Error(`seed: unknown exercise key ${key}`);
    return id;
  };

  // Your list starts empty: the template exists so there's something to add to, but it holds
  // no items until you pick some (Hard Rule 3 — it decides what's shown, nothing else).
  const template: Template = {
    id: newId(createdAt),
    user_id: LOCAL_USER_ID,
    name: 'My Exercises',
    is_default: true,
    updated_at: createdAt,
  };
  const templateItems: TemplateItem[] = [];

  const weights = new Map<string, number>(
    Object.entries(CATALOGUE).map(([key, entry]) => [key, entry.start]),
  );

  const setLogs: SetLog[] = [];
  let performed = 0;

  for (let k = 0; k < SEED_WEEKS * SESSIONS_PER_WEEK; k++) {
    if (SKIPPED.has(k)) continue;

    const week = Math.floor(k / SESSIONS_PER_WEEK);
    const dayOffset = SEED_WEEKS * 7 - (week * 7 + DAY_SLOTS[k % SESSIONS_PER_WEEK]);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - dayOffset);
    start.setHours(17, Math.floor(rng() * 90), 0, 0);
    let t = start.getTime();

    const plan = PLANS[performed % PLANS.length];

    for (const entry of plan) {
      if (entry.weeks && (week < entry.weeks[0] || week > entry.weeks[1])) continue;
      if (entry.every && performed % entry.every[0] !== entry.every[1]) continue;

      const ex = CATALOGUE[entry.key];
      const id = exerciseId(entry.key);
      const weight = weights.get(entry.key) ?? ex.start;

      const log = (kind: SetKind, w: number, reps: number, restSec: number, rpe: number | null) => {
        t += Math.round((restSec + between(25, 55)) * SEC); // rest, then the set itself
        setLogs.push({
          id: newId(t),
          user_id: LOCAL_USER_ID,
          exercise_id: id,
          session_id: null,
          logged_at: t,
          weight: w,
          reps,
          rpe,
          kind,
          updated_at: t,
        });
      };

      let rest = between(90, 150); // walking over from the previous exercise
      if (entry.warmup) {
        log('warmup', Math.max(BAR_KG, roundTo(weight * 0.5, 2.5)), 8, rest, null);
        log('warmup', Math.max(BAR_KG, roundTo(weight * 0.75, 2.5)), 3, between(45, 75), null);
        rest = between(60, 90);
      }

      // Bodyweight movements progress by reps rather than load.
      const baseReps = entry.reps + (ex.step === 0 ? Math.floor(week / 2) : 0);
      for (let s = 0; s < entry.sets; s++) {
        const last = s === entry.sets - 1;
        let reps = baseReps;
        if (last && chance(0.4)) reps -= 1;
        else if (s > 0 && chance(0.15)) reps -= 1;

        let kind: SetKind = 'working';
        if (last && entry.finisher === 'failure' && chance(0.5)) {
          kind = 'failure';
          reps += 2;
        }

        const rpe = entry.topRpe && last ? [7, 7.5, 8, 8.5, 9][Math.floor(rng() * 5)] : null;
        const restBefore = s === 0 ? rest : between(ex.rest * 0.8, ex.rest * 1.2);
        log(kind, weight, Math.max(1, reps), restBefore, rpe);
      }

      if (entry.finisher === 'drop' && ex.step > 0 && chance(0.5)) {
        log('drop', Math.max(ex.step, roundTo(weight * 0.8, ex.step)), baseReps + 3, between(10, 25), null);
      }

      if (ex.step > 0 && chance(0.55)) weights.set(entry.key, weight + ex.step);
    }

    performed++;
  }

  return { exercises, templates: [template], templateItems, setLogs };
}
