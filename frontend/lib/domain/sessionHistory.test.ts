import { describe, expect, it } from 'vitest';
import { deriveSessions, SESSION_GAP_MINUTES } from './sessions';
import { sessionCard, sessionWeeks, weekLabel } from './sessionHistory';
import { makeExercise, makeSet } from './test-utils';
import { weekRange } from './week';

// Every date is built with the LOCAL-time constructor, so these tests give the same result in
// any timezone. NOW is Wednesday 30 September 2026, 20:00; its week is Mon 28 Sep – Sun 4 Oct.
const at = (year: number, month: number, date: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, date, hour, minute).getTime();
const NOW = at(2026, 9, 30, 20);
const monday = (year: number, month: number, date: number) => new Date(year, month - 1, date).getTime();

const squat = makeExercise({ name: 'Squat', pattern: 'squat' });
const bench = makeExercise({ name: 'Bench', pattern: 'push' });
const row = makeExercise({ name: 'Row', pattern: 'pull' });

// A session of `count` sets of one exercise, a minute apart, starting at `start`.
const sessionAt = (start: number, exerciseId = squat.id, count = 1) =>
  deriveSessions(
    Array.from({ length: count }, (_, i) => makeSet({ exercise_id: exerciseId, logged_at: start + i * 60_000 })),
    SESSION_GAP_MINUTES,
    [],
  )[0];

describe('weekLabel', () => {
  it('names this week and last week', () => {
    expect(weekLabel(monday(2026, 9, 28), NOW)).toBe('This week');
    expect(weekLabel(monday(2026, 9, 21), NOW)).toBe('Last week');
  });

  it('gives any older week as its Monday to Sunday', () => {
    expect(weekLabel(monday(2026, 9, 14), NOW)).toBe('14 – 20 Sep');
    expect(weekLabel(monday(2026, 8, 31), NOW)).toBe('31 Aug – 6 Sep');
  });

  it('adds the year when it is not this one, on both ends across New Year', () => {
    expect(weekLabel(monday(2025, 9, 15), NOW)).toBe('15 – 21 Sep 2025');
    expect(weekLabel(monday(2025, 12, 29), NOW)).toBe('29 Dec 2025 – 4 Jan');
  });

  it('still finds last week across a daylight-saving change', () => {
    // Europe and the US both shift in the weeks around these; the calendar decides, not 7 × 24 h.
    const now = at(2026, 11, 4, 12);
    expect(weekLabel(weekRange(at(2026, 10, 28)).start, now)).toBe('Last week');
    // Mon 23 – Sun 29 Mar holds Europe's spring change (Sunday 29th): a 167-hour week.
    expect(weekLabel(weekRange(at(2026, 3, 25)).start, at(2026, 4, 1))).toBe('Last week');
  });
});

describe('sessionWeeks', () => {
  it('is empty with no sessions', () => {
    expect(sessionWeeks([], NOW)).toEqual([]);
  });

  it('groups by week, newest week and newest session first, leaving empty weeks out', () => {
    const monThisWeek = sessionAt(at(2026, 9, 28, 18));
    const wedThisWeek = sessionAt(at(2026, 9, 30, 18));
    const threeWeeksAgo = sessionAt(at(2026, 9, 9, 18));
    const weeks = sessionWeeks([threeWeeksAgo, monThisWeek, wedThisWeek], NOW);

    expect(weeks.map((week) => week.label)).toEqual(['This week', '7 – 13 Sep']);
    expect(weeks[0].sessions.map((session) => session.id)).toEqual([wedThisWeek.id, monThisWeek.id]);
    expect(weeks[0].start).toBe(monday(2026, 9, 28));
  });

  it('keeps a Sunday-night session in the week it started', () => {
    const sunday = sessionAt(at(2026, 9, 27, 23, 30));
    expect(sessionWeeks([sunday], NOW)[0].label).toBe('Last week');
  });

  it("marks the days a session started on, and today's future days", () => {
    const [week] = sessionWeeks([sessionAt(at(2026, 9, 28, 18)), sessionAt(at(2026, 9, 30, 7))], NOW);
    expect(week.days.filter((day) => day.trained).map((day) => day.date)).toEqual([28, 30]);
    expect(week.days.filter((day) => day.future).map((day) => day.date)).toEqual([1, 2, 3, 4]);
  });
});

describe('sessionCard', () => {
  const start = at(2026, 9, 30, 18);
  const sets = [
    makeSet({ exercise_id: row.id, logged_at: start }),
    makeSet({ exercise_id: squat.id, logged_at: start + 10 * 60_000 }),
    makeSet({ exercise_id: bench.id, logged_at: start + 20 * 60_000 }),
    makeSet({ exercise_id: squat.id, logged_at: start + 30 * 60_000 }),
  ];
  const [session] = deriveSessions(sets, SESSION_GAP_MINUTES, []);

  it('counts sets and exercises, and gives the duration and end', () => {
    expect(sessionCard(session, [squat, bench, row], new Set())).toMatchObject({
      id: sets[0].id,
      started_at: start,
      end: start + 30 * 60_000,
      durationMs: 30 * 60_000,
      sets: 4,
      exercises: 3,
      records: 0,
    });
  });

  it('lists the patterns touched in board order, not the order trained', () => {
    expect(sessionCard(session, [squat, bench, row], new Set()).patterns).toEqual(['squat', 'push', 'pull']);
  });

  it('ends at the Finish marker when there is one', () => {
    const [finished] = deriveSessions(sets, SESSION_GAP_MINUTES, [start + 40 * 60_000]);
    expect(sessionCard(finished, [squat], new Set())).toMatchObject({ end: start + 40 * 60_000, durationMs: 40 * 60_000 });
  });

  it("counts only this session's sets among the records", () => {
    const records = new Set([sets[1].id, sets[3].id, 'a-set-from-another-session']);
    expect(sessionCard(session, [squat, bench, row], records).records).toBe(2);
  });

  it('leaves out the pattern of a set whose exercise is not on this device', () => {
    expect(sessionCard(session, [squat], new Set()).patterns).toEqual(['squat']);
  });
});
