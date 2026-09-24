import { describe, expect, it } from 'vitest';
import { weekOf, weekRange } from './week';

// Every date is built with the LOCAL-time constructor, so these tests give the same result in
// any timezone. NOW is Thursday 24 September 2026, 10:00; its week is Mon 21 – Sun 27.
const at = (year: number, month: number, date: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, date, hour, minute).getTime();
const NOW = at(2026, 9, 24, 10);

describe('weekOf', () => {
  it('gives seven days, Monday first', () => {
    const week = weekOf(NOW, [], NOW);
    expect(week.map((day) => day.initial).join('')).toBe('MTWTFSS');
    expect(week.map((day) => day.date)).toEqual([21, 22, 23, 24, 25, 26, 27]);
    expect(week[0]).toMatchObject({ key: '2026-09-21', name: 'Monday' });
  });

  it('puts a Sunday in the week that started the Monday before', () => {
    expect(weekOf(at(2026, 9, 27, 23, 59), [], NOW).map((day) => day.date)).toEqual([
      21, 22, 23, 24, 25, 26, 27,
    ]);
  });

  it('puts a Monday just after midnight in its own week', () => {
    expect(weekOf(at(2026, 9, 28, 0, 1), [], NOW)[0].date).toBe(28);
  });

  it('marks a day trained when any set was logged on it', () => {
    const week = weekOf(NOW, [at(2026, 9, 22, 0, 1), at(2026, 9, 24, 23, 59)], NOW);
    expect(week.filter((day) => day.trained).map((day) => day.date)).toEqual([22, 24]);
  });

  it('counts several sets on one day once', () => {
    const week = weekOf(NOW, [at(2026, 9, 21, 9), at(2026, 9, 21, 10), at(2026, 9, 21, 11)], NOW);
    expect(week.filter((day) => day.trained)).toHaveLength(1);
  });

  it('ignores sets outside the week', () => {
    // `now` is past the week, so the Monday-after set isn't taken for a future-stamped one.
    const later = at(2026, 10, 5);
    const week = weekOf(NOW, [at(2026, 9, 20, 23, 59), at(2026, 9, 28, 0, 1)], later);
    expect(week.some((day) => day.trained)).toBe(false);
  });

  it("marks only the anchor's day", () => {
    const week = weekOf(at(2026, 9, 22, 18), [], NOW);
    expect(week.filter((day) => day.anchor).map((day) => day.date)).toEqual([22]);
  });

  it('marks the days after today as future', () => {
    const week = weekOf(NOW, [], NOW);
    expect(week.filter((day) => day.future).map((day) => day.date)).toEqual([25, 26, 27]);
  });

  it('has no future days in a past week', () => {
    expect(weekOf(at(2026, 9, 1), [], NOW).some((day) => day.future)).toBe(false);
  });

  it('counts a set stamped in the future as today', () => {
    const week = weekOf(NOW, [at(2026, 9, 26)], NOW);
    expect(week.filter((day) => day.trained).map((day) => day.date)).toEqual([24]);
  });

  it('runs across a month end', () => {
    expect(weekOf(at(2026, 10, 1), [], NOW).map((day) => day.key)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
  });

  it('runs across a year end', () => {
    const week = weekOf(at(2026, 12, 31), [], NOW);
    expect(week[0].key).toBe('2026-12-28');
    expect(week[6].key).toBe('2027-01-03');
  });

  // Europe's clocks change on 25 Oct 2026, the US's on 1 Nov, New Zealand's on 27 Sep: whichever
  // zone this runs in, each week is still seven consecutive dates.
  it.each([
    [at(2026, 9, 24), [21, 22, 23, 24, 25, 26, 27]],
    [at(2026, 10, 22), [19, 20, 21, 22, 23, 24, 25]],
    [at(2026, 10, 29), [26, 27, 28, 29, 30, 31, 1]],
  ])('keeps seven consecutive days across a daylight-saving change', (anchor, dates) => {
    expect(weekOf(anchor, [], NOW).map((day) => day.date)).toEqual(dates);
  });
});

describe('weekRange', () => {
  it('runs from Monday midnight to the next Monday midnight', () => {
    expect(weekRange(NOW)).toEqual({ start: at(2026, 9, 21, 0), end: at(2026, 9, 28, 0) });
  });

  it('holds its bounds across a daylight-saving change', () => {
    expect(weekRange(at(2026, 10, 22))).toEqual({ start: at(2026, 10, 19, 0), end: at(2026, 10, 26, 0) });
    expect(weekRange(at(2026, 10, 29))).toEqual({ start: at(2026, 10, 26, 0), end: at(2026, 11, 2, 0) });
  });

  it('includes a set at the very start and excludes one at the end', () => {
    const { start, end } = weekRange(NOW);
    const inWeek = (time: number) => time >= start && time < end;
    expect(inWeek(at(2026, 9, 21, 0, 0))).toBe(true);
    expect(inWeek(at(2026, 9, 28, 0, 0))).toBe(false);
  });
});
