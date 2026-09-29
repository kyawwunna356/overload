import type { Mastery } from './domain/mastery';
import type { Muscle } from './domain/muscles';
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

const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
};

export function muscleLabel(muscle: Muscle): string {
  return MUSCLE_LABELS[muscle];
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

// "82.5 × 5", for the log sheet's set table where the kg is understood; "BW × 9" for bodyweight.
export function formatSetShort(set: Pick<SetLog, 'weight' | 'reps'>): string {
  return `${set.weight === 0 ? 'BW' : formatNumber(set.weight)} × ${set.reps}`;
}

// A record in three parts, for the rewards list and the record pop-up: what kind it is, what it beat
// and what it's now. The loudest record the set broke is the one named — heavier beats more reps
// beats a better e1RM.
//   weight: Heaviest            · 100  → 102.5 kg × 5
//   reps:   Most reps at 105 kg · 105 kg × 5 → 6 reps
//   e1rm:   Best est. 1RM       · 110  → 115 kg
// For weight and e1RM the old value is just the number — the unit follows once, on the new one — so
// the line stays short enough for a phone. A reps record names its weight before the arrow, since
// "5 → 6 reps" alone doesn't say at what.
export type RecordParts = { label: string; from: string; to: string };

export function recordParts(set: Pick<SetLog, 'weight' | 'reps'>, prs: readonly PR[]): RecordParts {
  const weight = prs.find((pr) => pr.kind === 'weight');
  if (weight) return { label: 'Heaviest', from: formatNumber(weight.previous), to: formatSet(set) };
  const reps = prs.find((pr) => pr.kind === 'reps');
  if (reps) {
    const load = set.weight === 0 ? 'BW' : `${formatNumber(set.weight)} kg`;
    return { label: `Most reps at ${load}`, from: `${load} × ${reps.previous}`, to: countLabel(set.reps, 'rep') };
  }
  const e1rm = prs.find((pr) => pr.kind === 'e1rm');
  if (e1rm) {
    return { label: 'Best est. 1RM', from: prAmount(e1rm, e1rm.previous).replace(' kg', ''), to: prAmount(e1rm, e1rm.value) };
  }
  return { label: 'Record', from: '', to: formatSet(set) };
}

// "today", "1d", "6d". Rounds, so a set from yesterday evening still reads "1d" the
// next morning rather than "today".
export function formatDaysAgo(days: number): string {
  const whole = Math.round(days);
  return whole < 1 ? 'today' : `${whole}d`;
}

// The board's header, "Tue 30 Sep": the local day in fixed English, like the history's day labels.
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDay(timestamp: number): string {
  const d = new Date(timestamp);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// A session's clock time, "18:04 – 19:16". Both ends land in the same minute for a short session,
// and "1:40 – 1:40" reads like a bug, so one time is shown instead.
export function formatSpan(start: number, end: number): string {
  const from = formatTime(start);
  const to = formatTime(end);
  return from === to ? from : `${from} – ${to}`;
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

// "4,215": a whole number with fixed en-US grouping, so the phone's locale can't change it.
const GROUPING = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export function formatWhole(value: number): string {
  return GROUPING.format(Math.round(value));
}

// "4,215 kg": whole kilos.
export function formatKg(total: number): string {
  return `${formatWhole(total)} kg`;
}

// "1 set", "12 sets", "0 exercises" — every word used here pluralises with an "s".
export function countLabel(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// A session's heading, "Thursday, 1 Oct" — with the year when it isn't this year's.
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function formatLongDay(timestamp: number, now: number): string {
  const d = new Date(timestamp);
  const day = `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? day : `${day} ${d.getFullYear()}`;
}

// 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st.
const ORDINAL_SUFFIX: Partial<Record<number, string>> = { 1: 'st', 2: 'nd', 3: 'rd' };
export function formatOrdinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? 'th' : (ORDINAL_SUFFIX[n % 10] ?? 'th')}`;
}
