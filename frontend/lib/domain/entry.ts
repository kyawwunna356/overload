import type { SetLog } from './types';

// Pure helpers behind the log sheet's entry form: how the ± buttons step, how typed text
// is read, and what the form starts with. No clock, no storage.

export const WEIGHT_STEP_KG = 2.5;
export const REPS_STEP = 1;

const MAX_WEIGHT_KG = 1000;
const MAX_REPS = 999;

export type Entry = { weight: number; reps: number };

// What an exercise with no working set yet starts at. Weight 0 means bodyweight, so the
// user types the load once (or steps up from bodyweight).
export const DEFAULT_ENTRY: Entry = { weight: 0, reps: 8 };

// The form starts as a copy of the last working set — one tap on "Log set" repeats it.
export function prefillFrom(previous: Pick<SetLog, 'weight' | 'reps'> | null): Entry {
  return previous ? { weight: previous.weight, reps: previous.reps } : DEFAULT_ENTRY;
}

// Where the next set's numbers come from, in order: the same set number last time (set 3 from
// last time's set 3), else your last working set today, else your last working set ever, else the
// default. `setNumber` counts from 1. `source` lets the sheet say which it used.
export type Prefill = { entry: Entry; source: 'last-time' | 'today' | 'previous' | 'default' };

export function prefillFor(
  setNumber: number,
  lastTime: readonly Pick<SetLog, 'weight' | 'reps'>[],
  today: readonly Pick<SetLog, 'weight' | 'reps' | 'kind'>[],
  previous: Pick<SetLog, 'weight' | 'reps'> | null,
): Prefill {
  const same = lastTime[setNumber - 1];
  if (same) return { entry: prefillFrom(same), source: 'last-time' };
  const todayWorking = today.filter((set) => set.kind === 'working').at(-1);
  if (todayWorking) return { entry: prefillFrom(todayWorking), source: 'today' };
  if (previous) return { entry: prefillFrom(previous), source: 'previous' };
  return { entry: DEFAULT_ENTRY, source: 'default' };
}

export function stepWeight(weight: number, direction: 1 | -1): number {
  return clamp(round2(weight + direction * WEIGHT_STEP_KG), 0, MAX_WEIGHT_KG);
}

export function stepReps(reps: number, direction: 1 | -1): number {
  return clamp(reps + direction * REPS_STEP, 1, MAX_REPS);
}

// Typed weight in kg: "82.5", "82,5" (decimal comma), "82." while mid-typing. At most two
// decimals. Returns null for anything else so a half-typed or junk value never reaches a log.
export function parseWeight(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value <= MAX_WEIGHT_KG ? round2(value) : null;
}

// Typed reps: a whole number from 1 to 999.
export function parseReps(text: string): number | null {
  const cleaned = text.trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= 1 && value <= MAX_REPS ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
