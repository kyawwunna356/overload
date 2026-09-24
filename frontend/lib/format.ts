import type { Mastery } from './domain/mastery';
import type { PR, PRKind } from './domain/prs';
import type { Pattern, SetKind, SetLog } from './domain/types';

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

const KIND_LABELS: Record<SetKind, string> = {
  working: 'Working',
  warmup: 'Warmup',
  drop: 'Drop',
  failure: 'Failure',
};

export function kindLabel(kind: SetKind): string {
  return KIND_LABELS[kind];
}

// 82.5 -> "82.5", 85 -> "85"; never shows floating-point noise.
export function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

// "82.5 kg × 5"; a weight of 0 means bodyweight: "BW × 9".
export function formatSet(set: Pick<SetLog, 'weight' | 'reps'>): string {
  const load = set.weight === 0 ? 'BW' : `${formatNumber(set.weight)} kg`;
  return `${load} × ${set.reps}`;
}

// "today", "1d", "6d". Rounds, so a set from yesterday evening still reads "1d" the
// next morning rather than "today".
export function formatDaysAgo(days: number): string {
  const whole = Math.round(days);
  return whole < 1 ? 'today' : `${whole}d`;
}

// Local time of day, e.g. "18:42" or "6:42 PM" depending on the phone's locale.
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const PR_KIND_LABELS: Record<PRKind, string> = {
  weight: 'Heaviest',
  reps: 'Most reps at this weight',
  e1rm: 'Est. 1RM',
};

export function prKindLabel(kind: PRKind): string {
  return PR_KIND_LABELS[kind];
}

// One side of a record in its own unit: "102.5 kg" for weight and e1RM, "6" for reps.
export function prAmount(pr: PR, value: number): string {
  return pr.kind === 'reps' ? String(value) : `${formatNumber(Math.round(value * 10) / 10)} kg`;
}

// "16 sessions · 5 to Level 6", "1 session · 2 to Level 2".
export function masteryLine(mastery: Mastery): string {
  const toGo = mastery.nextLevelAt - mastery.sessions;
  return `${countLabel(mastery.sessions, 'session')} · ${toGo} to Level ${mastery.level + 1}`;
}

// "4,215 kg": whole kilos with fixed en-US grouping, so the phone's locale can't change it.
const KG_GROUPING = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export function formatKg(total: number): string {
  return `${KG_GROUPING.format(Math.round(total))} kg`;
}

// "1 set", "12 sets", "0 exercises" — every word used here pluralises with an "s".
export function countLabel(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
