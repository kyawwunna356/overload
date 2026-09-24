import { describe, expect, it } from 'vitest';
import { sessionPRs } from './prs';
import { recapCards, sessionRecap, type Recap } from './recap';
import { deriveSessions, SESSION_GAP_MINUTES } from './sessions';
import { makeSet } from './test-utils';
import type { SetLog } from './types';

// Dates use the LOCAL-time constructor, so these tests give the same result in any timezone.
const at = (month: number, date: number, hour = 12, minute = 0) =>
  new Date(2026, month - 1, date, hour, minute).getTime();

// The session made of exactly these sets.
const sessionOf = (sets: SetLog[]) => {
  const [session] = deriveSessions(sets, SESSION_GAP_MINUTES, []);
  return session;
};

describe('sessionRecap', () => {
  it('totals weight × reps over every set, warmups included and bodyweight as 0', () => {
    const session = sessionOf([
      makeSet({ id: 'w', logged_at: at(9, 1, 12, 0), weight: 40, reps: 10, kind: 'warmup' }),
      makeSet({ id: 'a', logged_at: at(9, 1, 12, 5), weight: 82.5, reps: 5 }),
      makeSet({ id: 'b', logged_at: at(9, 1, 12, 10), exercise_id: 'ex-2', weight: 0, reps: 12 }),
    ]);
    expect(sessionRecap(session, []).totalKg).toBe(400 + 412.5);
  });

  it('has no records when the session beat nothing', () => {
    const history = [makeSet({ id: 'old', logged_at: at(8, 1), weight: 100, reps: 5 })];
    const session = sessionOf([makeSet({ id: 'now', logged_at: at(9, 1), weight: 90, reps: 5 })]);
    expect(sessionRecap(session, history).prs).toEqual([]);
  });

  it('lists the same records as sessionPRs', () => {
    const history = [
      makeSet({ id: 'old-1', logged_at: at(8, 1), weight: 90, reps: 5 }),
      makeSet({ id: 'old-2', logged_at: at(8, 8), weight: 95, reps: 5 }),
    ];
    const sets = [
      makeSet({ id: 'a', logged_at: at(9, 1, 12, 0), weight: 100, reps: 5 }),
      makeSet({ id: 'b', logged_at: at(9, 1, 12, 5), weight: 100, reps: 5 }),
      makeSet({ id: 'c', logged_at: at(9, 1, 12, 10), weight: 100, reps: 6 }),
    ];
    const recap = sessionRecap(sessionOf(sets), [...history, ...sets]);
    expect(recap.prs).toEqual(sessionPRs(sets, history));
    expect(recap.prs.map((entry) => entry.set.id)).toEqual(['a', 'c']);
  });

  it('counts the first-ever session of a lift as reaching level 1', () => {
    const session = sessionOf([makeSet({ id: 'first', logged_at: at(9, 1) })]);
    expect(sessionRecap(session, []).levelUps).toEqual([{ exerciseId: 'ex-1', level: 1 }]);
  });

  it('reports level 2 on the third day of a lift', () => {
    const history = [
      makeSet({ id: 'd1', logged_at: at(8, 1) }),
      makeSet({ id: 'd2', logged_at: at(8, 2) }),
    ];
    const session = sessionOf([makeSet({ id: 'd3', logged_at: at(8, 3) })]);
    expect(sessionRecap(session, history).levelUps).toEqual([{ exerciseId: 'ex-1', level: 2 }]);
  });

  it('raises nothing for a second session on a day already counted', () => {
    const morning = makeSet({ id: 'am', logged_at: at(9, 1, 8) });
    const session = sessionOf([makeSet({ id: 'pm', logged_at: at(9, 1, 18) })]);
    expect(sessionRecap(session, [morning]).levelUps).toEqual([]);
  });

  it('raises nothing on a day that reaches no new level', () => {
    const history = [makeSet({ id: 'd1', logged_at: at(8, 1) })];
    const session = sessionOf([makeSet({ id: 'd2', logged_at: at(8, 2) })]);
    expect(sessionRecap(session, history).levelUps).toEqual([]);
  });

  it('lists level-ups in the order the lifts were first performed', () => {
    const session = sessionOf([
      makeSet({ id: 'b1', exercise_id: 'ex-b', logged_at: at(9, 1, 12, 0) }),
      makeSet({ id: 'a1', exercise_id: 'ex-a', logged_at: at(9, 1, 12, 5) }),
      makeSet({ id: 'b2', exercise_id: 'ex-b', logged_at: at(9, 1, 12, 10) }),
    ]);
    expect(sessionRecap(session, []).levelUps.map((up) => up.exerciseId)).toEqual(['ex-b', 'ex-a']);
  });

  it('ignores history after the session', () => {
    const session = sessionOf([makeSet({ id: 'now', logged_at: at(9, 1), weight: 100, reps: 5 })]);
    const later = [
      makeSet({ id: 'l1', logged_at: at(9, 5), weight: 200, reps: 5 }),
      makeSet({ id: 'l2', logged_at: at(9, 6), weight: 200, reps: 5 }),
    ];
    const recap = sessionRecap(session, later);
    expect(recap.levelUps).toEqual([{ exerciseId: 'ex-1', level: 1 }]);
    expect(recap.prs).toEqual([]);
  });

  it('gives the same answer whatever order the history arrives in', () => {
    const history = [
      makeSet({ id: 'h1', logged_at: at(8, 1), weight: 90, reps: 5 }),
      makeSet({ id: 'h2', logged_at: at(8, 2), weight: 95, reps: 5 }),
    ];
    const session = sessionOf([makeSet({ id: 's', logged_at: at(8, 3), weight: 100, reps: 5 })]);
    expect(sessionRecap(session, [...history].reverse())).toEqual(sessionRecap(session, history));
  });
});

describe('recapCards', () => {
  const pr = (id: string) => ({ set: makeSet({ id }), prs: [{ kind: 'weight' as const, value: 1, previous: 0 }] });
  const up = (exerciseId: string) => ({ exerciseId, level: 2 });
  const recap = (prs: number, ups: number): Recap => ({
    totalKg: 1000,
    prs: Array.from({ length: prs }, (_, i) => pr(`p${i}`)),
    levelUps: Array.from({ length: ups }, (_, i) => up(`e${i}`)),
  });
  const PER = { records: 3, levels: 5 };
  const shape = (r: Recap, withMuscles = false) =>
    recapCards(r, PER, withMuscles).map((card) =>
      card.kind === 'total' || card.kind === 'muscles' ? card.kind : `${card.kind} ${card.page}/${card.of}`,
    );

  it('is one card for a session with no records or level-ups', () => {
    expect(shape(recap(0, 0))).toEqual(['total']);
  });

  it('fits up to a page of records on one card', () => {
    expect(shape(recap(3, 0))).toEqual(['total', 'records 1/1']);
  });

  it('spreads a longer list over more cards', () => {
    const cards = recapCards(recap(4, 0), PER, false);
    expect(shape(recap(4, 0))).toEqual(['total', 'records 1/2', 'records 2/2']);
    expect(cards[1].kind === 'records' && cards[1].prs.map((entry) => entry.set.id)).toEqual(['p0', 'p1', 'p2']);
    expect(cards[2].kind === 'records' && cards[2].prs.map((entry) => entry.set.id)).toEqual(['p3']);
  });

  it('orders the deck total, records, levels', () => {
    expect(shape(recap(1, 6))).toEqual(['total', 'records 1/1', 'levels 1/2', 'levels 2/2']);
  });

  it('gives level-ups their own cards when there are no records', () => {
    expect(shape(recap(0, 2))).toEqual(['total', 'levels 1/1']);
  });

  it('puts the muscle star second, before records and levels', () => {
    expect(shape(recap(1, 1), true)).toEqual(['total', 'muscles', 'records 1/1', 'levels 1/1']);
    expect(shape(recap(0, 0), true)).toEqual(['total', 'muscles']);
  });
});
