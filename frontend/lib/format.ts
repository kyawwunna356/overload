import type { Pattern, SetLog } from './domain/types';

// Display helpers only — no logic that decides anything belongs here.

const PATTERN_LABELS: Record<Pattern, string> = {
  squat: 'Squat',
  hinge: 'Hinge',
  push: 'Push',
  pull: 'Pull',
  accessory: 'Accessory',
  core: 'Core',
};

export function patternLabel(pattern: Pattern): string {
  return PATTERN_LABELS[pattern];
}

// "82.5 kg × 5"; a weight of 0 means bodyweight: "BW × 9".
export function formatSet(set: Pick<SetLog, 'weight' | 'reps'>): string {
  const load = set.weight === 0 ? 'BW' : `${Math.round(set.weight * 100) / 100} kg`;
  return `${load} × ${set.reps}`;
}

// "today", "1d", "6d". Rounds, so a set from yesterday evening still reads "1d" the
// next morning rather than "today".
export function formatDaysAgo(days: number): string {
  const whole = Math.round(days);
  return whole < 1 ? 'today' : `${whole}d`;
}
