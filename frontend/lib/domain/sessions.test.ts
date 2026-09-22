import { describe, expect, it } from 'vitest';
import {
  SESSION_GAP_MINUTES,
  activeSession,
  assignSession,
  deriveSessions,
  endMarkerTime,
  startsNewSession,
  summarizeSession,
} from './sessions';
import { makeExercise, makeSet } from './test-utils';

const MIN = 60 * 1000;
const GAP = SESSION_GAP_MINUTES;
const T0 = 1_000_000_000_000;

// A set `minutes` after T0.
const at = (minutes: number, overrides: Parameters<typeof makeSet>[0] = {}) =>
  makeSet({ logged_at: T0 + minutes * MIN, ...overrides });

describe('deriveSessions — the gap rule', () => {
  it('returns nothing for no sets', () => {
    expect(deriveSessions([], GAP, [])).toEqual([]);
  });

  it('makes one session of one set', () => {
    const set = at(0);
    expect(deriveSessions([set], GAP, [])).toEqual([
      {
        id: set.id,
        started_at: set.logged_at,
        last_set_at: set.logged_at,
        sets: [set],
        ended_at: null,
        endedManually: false,
      },
    ]);
  });

  it('keeps two sets exactly 90 minutes apart in one session', () => {
    const sessions = deriveSessions([at(0), at(90)], GAP, []);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sets).toHaveLength(2);
  });

  it('splits two sets 90 minutes and 1 ms apart', () => {
    const sessions = deriveSessions([at(0), makeSet({ logged_at: T0 + 90 * MIN + 1 })], GAP, []);
    expect(sessions).toHaveLength(2);
  });

  it('measures the gap between consecutive sets, not from the first set', () => {
    // Three hours in total, but never more than 60 minutes between neighbours.
    const sessions = deriveSessions([at(0), at(60), at(120), at(180)], GAP, []);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].started_at).toBe(T0);
    expect(sessions[0].last_set_at).toBe(T0 + 180 * MIN);
  });

  it('returns sessions oldest first with their sets oldest first, whatever the input order', () => {
    const a = at(0);
    const b = at(10);
    const c = at(500);
    const d = at(510);
    const sessions = deriveSessions([d, b, c, a], GAP, []);
    expect(sessions.map((s) => s.sets)).toEqual([[a, b], [c, d]]);
    expect(sessions.map((s) => s.id)).toEqual([a.id, c.id]);
  });

  it('orders sets with equal timestamps by id, so the session id is stable', () => {
    const early = makeSet({ id: 'a', logged_at: T0 });
    const late = makeSet({ id: 'b', logged_at: T0 });
    expect(deriveSessions([late, early], GAP, [])[0].id).toBe('a');
    expect(deriveSessions([early, late], GAP, [])[0].id).toBe('a');
  });

  it('counts every kind of set, so a warmup opens a session', () => {
    const warmup = at(0, { kind: 'warmup' });
    const working = at(5);
    const sessions = deriveSessions([working, warmup], GAP, []);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(warmup.id);
  });

  it('mixes exercises into one session', () => {
    const sessions = deriveSessions(
      [at(0, { exercise_id: 'a' }), at(3, { exercise_id: 'b' }), at(6, { exercise_id: 'a' })],
      GAP,
      [],
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sets).toHaveLength(3);
  });

  it('does not mutate its input', () => {
    const logs = [at(10), at(0)];
    deriveSessions(logs, GAP, []);
    expect(logs.map((l) => l.logged_at)).toEqual([T0 + 10 * MIN, T0]);
  });
});

describe('deriveSessions — end markers', () => {
  it('splits a run that is within the gap', () => {
    const before = at(0);
    const after = at(10);
    const sessions = deriveSessions([before, after], GAP, [T0 + 5 * MIN]);
    expect(sessions.map((s) => s.sets)).toEqual([[before], [after]]);
    expect(sessions[0].endedManually).toBe(true);
    expect(sessions[1].endedManually).toBe(false);
  });

  it('closes the last session when the marker is after its last set', () => {
    const sessions = deriveSessions([at(0), at(10)], GAP, [T0 + 12 * MIN]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].endedManually).toBe(true);
  });

  it('puts a marker equal to a set’s time after that set', () => {
    const first = at(0);
    const second = at(10);
    const sessions = deriveSessions([first, second], GAP, [second.logged_at]);
    expect(sessions.map((s) => s.sets)).toEqual([[first, second]]);
    expect(sessions[0].endedManually).toBe(true);
  });

  it('ignores a marker before every set', () => {
    const sessions = deriveSessions([at(0), at(10)], GAP, [T0 - MIN]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].endedManually).toBe(false);
  });

  it('treats two markers on one session as one', () => {
    const sessions = deriveSessions([at(0), at(10)], GAP, [T0 + 11 * MIN, T0 + 12 * MIN]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].endedManually).toBe(true);
  });

  it('marks a session ended when a marker and the gap both close it', () => {
    const sessions = deriveSessions([at(0), at(500)], GAP, [T0 + 20 * MIN]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].endedManually).toBe(true);
    expect(sessions[1].endedManually).toBe(false);
  });

  it('leaves a session closed by the gap alone not ended manually', () => {
    const sessions = deriveSessions([at(0), at(500)], GAP, []);
    expect(sessions.map((s) => s.endedManually)).toEqual([false, false]);
  });
});

describe('startsNewSession', () => {
  it('is false within the gap, exactly at it, and true a millisecond past it', () => {
    const earlier = at(0);
    expect(startsNewSession(earlier, at(60), GAP, [])).toBe(false);
    expect(startsNewSession(earlier, at(90), GAP, [])).toBe(false);
    expect(startsNewSession(earlier, makeSet({ logged_at: T0 + 90 * MIN + 1 }), GAP, [])).toBe(true);
  });

  it('is true when an end marker falls between the two sets, and agrees with deriveSessions', () => {
    const [earlier, later] = [at(0), at(10)];
    expect(startsNewSession(earlier, later, GAP, [T0 + 5 * MIN])).toBe(true);
    expect(startsNewSession(earlier, later, GAP, [T0 + 11 * MIN])).toBe(false);
    expect(deriveSessions([earlier, later], GAP, [T0 + 5 * MIN])).toHaveLength(2);
  });
});

describe('assignSession', () => {
  it('gives every set exactly one session id', () => {
    const logs = [at(0), at(10), at(500), at(505), at(900)];
    const assignment = assignSession(logs, GAP, []);
    expect(assignment.size).toBe(logs.length);
    expect(new Set(assignment.values()).size).toBe(3);
  });

  it('maps a set to the id of the session that holds it', () => {
    const [a, b, c] = [at(0), at(10), at(500)];
    const assignment = assignSession([c, a, b], GAP, []);
    expect(assignment.get(a.id)).toBe(a.id);
    expect(assignment.get(b.id)).toBe(a.id);
    expect(assignment.get(c.id)).toBe(c.id);
  });

  it('follows end markers', () => {
    const [a, b] = [at(0), at(10)];
    const assignment = assignSession([a, b], GAP, [T0 + 5 * MIN]);
    expect(assignment.get(b.id)).toBe(b.id);
  });

  it('is empty for no sets', () => {
    expect(assignSession([], GAP, []).size).toBe(0);
  });
});

describe('activeSession', () => {
  const sessions = () => deriveSessions([at(0), at(10)], GAP, []);

  it('is null when there are no sessions', () => {
    expect(activeSession([], T0, GAP)).toBeNull();
  });

  it('is the latest session while its last set is within the gap', () => {
    const active = activeSession(sessions(), T0 + 30 * MIN, GAP);
    expect(active?.started_at).toBe(T0);
  });

  it('is still active exactly 90 minutes after the last set', () => {
    expect(activeSession(sessions(), T0 + 10 * MIN + 90 * MIN, GAP)).not.toBeNull();
  });

  it('is null 1 ms past the gap', () => {
    expect(activeSession(sessions(), T0 + 10 * MIN + 90 * MIN + 1, GAP)).toBeNull();
  });

  it('only ever considers the latest session', () => {
    const two = deriveSessions([at(0), at(500)], GAP, []);
    expect(activeSession(two, T0 + 10 * MIN, GAP)?.started_at).toBe(T0 + 500 * MIN);
  });

  it('counts a set stamped in the future as recent', () => {
    expect(activeSession(sessions(), T0, GAP)).not.toBeNull();
  });

  it('is null once the session was ended manually, even within the gap', () => {
    const ended = deriveSessions([at(0), at(10)], GAP, [T0 + 12 * MIN]);
    expect(activeSession(ended, T0 + 15 * MIN, GAP)).toBeNull();
  });

  it('is active again for a set logged after the marker', () => {
    const resumed = deriveSessions([at(0), at(10), at(20)], GAP, [T0 + 12 * MIN]);
    const active = activeSession(resumed, T0 + 25 * MIN, GAP);
    expect(active?.started_at).toBe(T0 + 20 * MIN);
  });
});

describe('summarizeSession', () => {
  const squat = makeExercise({ id: 'squat', name: 'Squat' });
  const bench = makeExercise({ id: 'bench', name: 'Bench', pattern: 'push' });

  it('groups sets by exercise in the order each was first performed', () => {
    const [s1, b1, s2] = [
      at(0, { exercise_id: 'squat' }),
      at(5, { exercise_id: 'bench' }),
      at(10, { exercise_id: 'squat' }),
    ];
    const [session] = deriveSessions([s1, b1, s2], GAP, []);
    const summary = summarizeSession(session, [bench, squat]);
    expect(summary.groups.map((g) => g.exercise?.id)).toEqual(['squat', 'bench']);
    expect(summary.groups[0].sets).toEqual([s1, s2]);
    expect(summary.groups[1].sets).toEqual([b1]);
  });

  it('counts sets, exercises and duration', () => {
    const logs = [
      at(0, { exercise_id: 'squat' }),
      at(5, { exercise_id: 'bench' }),
      at(45, { exercise_id: 'squat' }),
    ];
    const [session] = deriveSessions(logs, GAP, []);
    const summary = summarizeSession(session, [squat, bench]);
    expect(summary.setCount).toBe(3);
    expect(summary.exerciseCount).toBe(2);
    expect(summary.durationMs).toBe(45 * MIN);
    expect(summary.session).toBe(session);
  });

  it('has zero duration for a single set', () => {
    const [session] = deriveSessions([at(0, { exercise_id: 'squat' })], GAP, []);
    expect(summarizeSession(session, [squat]).durationMs).toBe(0);
  });

  it('gives a null exercise for a set whose exercise is not on this device', () => {
    const [session] = deriveSessions([at(0, { exercise_id: 'gone' })], GAP, []);
    const summary = summarizeSession(session, [squat]);
    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0].exercise).toBeNull();
    expect(summary.exerciseCount).toBe(1);
  });
});

describe('endMarkerTime', () => {
  const last = T0 + 30 * MIN;

  it('is now when the last set is in the past', () => {
    expect(endMarkerTime({ last_set_at: last }, [], last + 5 * MIN)).toBe(last + 5 * MIN);
  });

  it('is now when now is exactly the last set', () => {
    expect(endMarkerTime({ last_set_at: last }, [], last)).toBe(last);
  });

  it('is raised to the last set when that set is stamped in the future', () => {
    const future = last + 10 * MIN;
    const marker = endMarkerTime({ last_set_at: future }, [], last);
    expect(marker).toBe(future);
    expect(marker).toBeGreaterThanOrEqual(future);
  });

  it('is null when a marker at the last set already closes the session, so a second tap writes nothing', () => {
    expect(endMarkerTime({ last_set_at: last }, [last], last + MIN)).toBeNull();
  });

  it('is null when a marker after the last set already closes it', () => {
    expect(endMarkerTime({ last_set_at: last }, [last + 2 * MIN], last + 5 * MIN)).toBeNull();
  });

  it("ignores an older session's marker and still returns now", () => {
    expect(endMarkerTime({ last_set_at: last }, [last - 200 * MIN], last + 5 * MIN)).toBe(last + 5 * MIN);
  });

  it('gives a marker that ends the session and makes the next set open a new one, even within 90 minutes', () => {
    const sets = [at(0), at(30)];
    const marker = endMarkerTime({ last_set_at: T0 + 30 * MIN }, [], T0 + 31 * MIN);
    expect(marker).not.toBeNull();
    const markers = marker === null ? [] : [marker];
    expect(deriveSessions(sets, GAP, markers)[0].endedManually).toBe(true);
    const next = at(30, { logged_at: T0 + 31 * MIN + 1 });
    expect(deriveSessions([...sets, next], GAP, markers)).toHaveLength(2);
  });
});

describe('deriveSessions — when a session ended', () => {
  it('keeps the marker timestamp, so a finished session knows when it ended', () => {
    const finishedAt = T0 + 75 * MIN;
    const [session] = deriveSessions([at(0), at(30)], GAP, [finishedAt]);
    expect(session.ended_at).toBe(finishedAt);
    expect(session.endedManually).toBe(true);
  });

  it('leaves ended_at null when the gap closed it, or when it is still open', () => {
    const [closedByGap, stillOpen] = deriveSessions([at(0), at(200)], GAP, []);
    expect(closedByGap.ended_at).toBeNull();
    expect(closedByGap.endedManually).toBe(false);
    expect(stillOpen.ended_at).toBeNull();
  });

  it('takes the earliest marker when two close the same session', () => {
    const first = T0 + 40 * MIN;
    const [session] = deriveSessions([at(0), at(30)], GAP, [first + 10 * MIN, first]);
    expect(session.ended_at).toBe(first);
  });

  it('takes a marker exactly at the last set', () => {
    const [session] = deriveSessions([at(0), at(30)], GAP, [T0 + 30 * MIN]);
    expect(session.ended_at).toBe(T0 + 30 * MIN);
  });

  it("does not let a later session's marker leak into an earlier one", () => {
    const sessions = deriveSessions([at(0), at(200)], GAP, [T0 + 210 * MIN]);
    expect(sessions[0].ended_at).toBeNull();
    expect(sessions[1].ended_at).toBe(T0 + 210 * MIN);
  });
});

describe('summarizeSession — how long the session lasted', () => {
  const squat = makeExercise({ id: 'ex-1', name: 'Back Squat' });

  it('counts to the moment you finished, not to your last set', () => {
    const finishedAt = T0 + 75 * MIN;
    const [session] = deriveSessions([at(0), at(30)], GAP, [finishedAt]);
    expect(summarizeSession(session, [squat]).durationMs).toBe(75 * MIN);
  });

  it('counts to the last set when the gap closed it', () => {
    const [session] = deriveSessions([at(0), at(45)], GAP, []);
    expect(summarizeSession(session, [squat]).durationMs).toBe(45 * MIN);
  });

  it('gives a one-set session a real length once it is finished', () => {
    const [session] = deriveSessions([at(0)], GAP, [T0 + 12 * MIN]);
    expect(summarizeSession(session, [squat]).durationMs).toBe(12 * MIN);
  });

  it('is still zero for a single set the gap closed: nothing happened after it', () => {
    const [session] = deriveSessions([at(0)], GAP, []);
    expect(summarizeSession(session, [squat]).durationMs).toBe(0);
  });
});
