import type { Exercise, SetLog } from './types';

// Sessions are derived, never started (Hard Rule 2): a session is a run of sets with no gap
// larger than SESSION_GAP_MINUTES, computed from the sets every time it's needed (Hard Rule 1).
// The one stored fact is an optional end marker — "closed at time T" — for when you end a
// session yourself; it's passed in as a plain timestamp. Pure: `now` is an argument and
// nothing here reads the clock.

export const SESSION_GAP_MINUTES = 90;

const MINUTE_MS = 60 * 1000;

export type DerivedSession = {
  // The first set's id: stable, and needs no id generator.
  id: string;
  started_at: number;
  // The time of the last set. There is no stored end; an idle gap or a marker closes a session.
  last_set_at: number;
  // Oldest first.
  sets: SetLog[];
  // A marker closed it, as opposed to the gap rule (or it simply hasn't closed yet).
  endedManually: boolean;
};

// Splits sets into sessions, oldest first. A new session starts between two consecutive sets
// when they're MORE than `gapMinutes` apart (exactly the gap stays in one session), or when an
// end marker T falls at or after the earlier set and before the later one. Every kind of set
// counts — a warmup is usually the first thing logged. `endMarkers` are timestamps.
//
// `logs` may be unsorted and may mix exercises; the result never depends on input order.
export function deriveSessions(
  logs: readonly SetLog[],
  gapMinutes: number,
  endMarkers: readonly number[],
): DerivedSession[] {
  const gapMs = gapMinutes * MINUTE_MS;
  const sorted = [...logs].sort(oldestFirst);

  const runs: SetLog[][] = [];
  for (const set of sorted) {
    const run = runs.at(-1);
    const previous = run?.at(-1);
    if (run && previous && !startsNewSession(previous, set, gapMs, endMarkers)) run.push(set);
    else runs.push([set]);
  }

  return runs.map((sets, index) => {
    const first = sets[0];
    const last = sets[sets.length - 1];
    const nextStart = runs[index + 1]?.[0].logged_at ?? Infinity;
    return {
      id: first.id,
      started_at: first.logged_at,
      last_set_at: last.logged_at,
      sets,
      endedManually: endMarkers.some((marker) => marker >= last.logged_at && marker < nextStart),
    };
  });
}

// Session id for every set: the gap rule as a lookup, keyed by set id.
export function assignSession(
  logs: readonly SetLog[],
  gapMinutes: number,
  endMarkers: readonly number[],
): Map<string, string> {
  const assignment = new Map<string, string>();
  for (const session of deriveSessions(logs, gapMinutes, endMarkers)) {
    for (const set of session.sets) assignment.set(set.id, session.id);
  }
  return assignment;
}

// The session you're in right now, or null. Only the latest session can be active, and only
// while it hasn't been ended and its last set is at most `gapMinutes` old. A set stamped in
// the future (clock skew) counts as recent.
export function activeSession(
  sessions: readonly DerivedSession[],
  now: number,
  gapMinutes: number,
): DerivedSession | null {
  const latest = sessions.at(-1);
  if (!latest || latest.endedManually) return null;
  return now - latest.last_set_at <= gapMinutes * MINUTE_MS ? latest : null;
}

export type SessionGroup = {
  // Null when the exercise row isn't on this device, so an orphan set can't break the summary.
  exercise: Exercise | null;
  // Oldest first.
  sets: SetLog[];
};

export type SessionSummary = {
  session: DerivedSession;
  // One group per exercise, in the order each was first performed.
  groups: SessionGroup[];
  setCount: number;
  exerciseCount: number;
  // First set to last set. Zero for a session of one set.
  durationMs: number;
};

// What one session contained. Reads nothing but the session's own sets and the exercise rows —
// never a template (Hard Rule 3).
export function summarizeSession(
  session: DerivedSession,
  exercises: readonly Exercise[],
): SessionSummary {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const groups = new Map<string, SessionGroup>();
  for (const set of session.sets) {
    const group = groups.get(set.exercise_id);
    if (group) group.sets.push(set);
    else groups.set(set.exercise_id, { exercise: byId.get(set.exercise_id) ?? null, sets: [set] });
  }

  return {
    session,
    groups: [...groups.values()],
    setCount: session.sets.length,
    exerciseCount: groups.size,
    durationMs: session.last_set_at - session.started_at,
  };
}

function startsNewSession(
  previous: SetLog,
  next: SetLog,
  gapMs: number,
  endMarkers: readonly number[],
): boolean {
  if (next.logged_at - previous.logged_at > gapMs) return true;
  return endMarkers.some((marker) => marker >= previous.logged_at && marker < next.logged_at);
}

// Oldest first; equal timestamps fall back to id (UUIDv7 sorts by time) for a stable order.
function oldestFirst(a: SetLog, b: SetLog): number {
  return a.logged_at - b.logged_at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
