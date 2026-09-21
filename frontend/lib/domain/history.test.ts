import { describe, expect, it } from 'vitest';
import { dayLabel, groupByDay, ordinal } from './history';
import { makeSet } from './test-utils';

// Every date is built with the LOCAL-time constructor, so these tests give the same result in
// any timezone. NOW is Thursday 24 September 2026, 10:00.
const at = (year: number, month: number, date: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, date, hour, minute).getTime();
const NOW = at(2026, 9, 24, 10);
const setAt = (timestamp: number, overrides = {}) => makeSet({ logged_at: timestamp, ...overrides });

describe('ordinal', () => {
  it.each([
    [1, 'st'],
    [2, 'nd'],
    [3, 'rd'],
    [4, 'th'],
    [10, 'th'],
    [11, 'th'],
    [12, 'th'],
    [13, 'th'],
    [14, 'th'],
    [20, 'th'],
    [21, 'st'],
    [22, 'nd'],
    [23, 'rd'],
    [24, 'th'],
    [30, 'th'],
    [31, 'st'],
  ])('%i takes "%s"', (n, suffix) => {
    expect(ordinal(n)).toBe(suffix);
  });
});

describe('dayLabel', () => {
  it('labels today, at any time of day', () => {
    expect(dayLabel(at(2026, 9, 24, 0, 1), NOW)).toBe('Today');
    expect(dayLabel(at(2026, 9, 24, 9, 59), NOW)).toBe('Today');
  });

  it('labels yesterday', () => {
    expect(dayLabel(at(2026, 9, 23, 23, 59), NOW)).toBe('Yesterday');
    expect(dayLabel(at(2026, 9, 23, 0, 1), NOW)).toBe('Yesterday');
  });

  it('uses the weekday name from 2 to 6 days ago', () => {
    expect(dayLabel(at(2026, 9, 22), NOW)).toBe('Tuesday'); // 2 days ago
    expect(dayLabel(at(2026, 9, 21), NOW)).toBe('Monday'); // 3
    expect(dayLabel(at(2026, 9, 20), NOW)).toBe('Sunday'); // 4
    expect(dayLabel(at(2026, 9, 19), NOW)).toBe('Saturday'); // 5
    expect(dayLabel(at(2026, 9, 18), NOW)).toBe('Friday'); // 6
  });

  it('switches to the date at exactly 7 days, so a weekday name is never ambiguous', () => {
    expect(dayLabel(at(2026, 9, 17), NOW)).toBe('17th of September'); // last Thursday, 7 days
  });

  it('uses the date for anything older', () => {
    expect(dayLabel(at(2026, 9, 13), NOW)).toBe('13th of September');
    expect(dayLabel(at(2026, 9, 1), NOW)).toBe('1st of September');
    expect(dayLabel(at(2026, 8, 22), NOW)).toBe('22nd of August');
    expect(dayLabel(at(2026, 8, 3), NOW)).toBe('3rd of August');
    expect(dayLabel(at(2026, 1, 12), NOW)).toBe('12th of January');
  });

  it('adds the year only when it is not the current year', () => {
    expect(dayLabel(at(2025, 12, 31), NOW)).toBe('31st of December 2025');
    expect(dayLabel(at(2025, 9, 13), NOW)).toBe('13th of September 2025');
  });

  it('counts days across a month boundary and a leap day', () => {
    const now = at(2028, 3, 1, 10); // Wednesday 1 March 2028
    expect(dayLabel(at(2028, 2, 29), now)).toBe('Yesterday');
    expect(dayLabel(at(2028, 2, 28), now)).toBe('Monday');
    expect(dayLabel(at(2028, 2, 23), now)).toBe('23rd of February');
  });

  it('treats a timestamp in the future as today', () => {
    expect(dayLabel(NOW + 5 * 60_000, NOW)).toBe('Today');
    expect(dayLabel(at(2026, 9, 25), NOW)).toBe('Today');
  });
});

describe('groupByDay', () => {
  it('returns nothing for no sets', () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });

  it('puts sets from the same local day in one group, keyed YYYY-MM-DD', () => {
    const groups = groupByDay(
      [setAt(at(2026, 9, 22, 8)), setAt(at(2026, 9, 22, 18)), setAt(at(2026, 9, 22, 12))],
      NOW,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].day).toBe('2026-09-22');
    expect(groups[0].label).toBe('Tuesday');
    expect(groups[0].sets).toHaveLength(3);
  });

  it('orders days newest first and sets within a day newest first', () => {
    const a = setAt(at(2026, 9, 22, 8));
    const b = setAt(at(2026, 9, 22, 18));
    const c = setAt(at(2026, 9, 24, 9));
    const d = setAt(at(2026, 9, 10, 12));
    const groups = groupByDay([a, d, b, c], NOW);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Tuesday', '10th of September']);
    expect(groups[1].sets).toEqual([b, a]);
  });

  it('splits at local midnight: 23:59 and 00:01 are different days', () => {
    const late = setAt(at(2026, 9, 23, 23, 59));
    const early = setAt(at(2026, 9, 24, 0, 1));
    const groups = groupByDay([late, early], NOW);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday']);
    expect(groups[0].sets).toEqual([early]);
    expect(groups[1].sets).toEqual([late]);
  });

  it('keeps every kind of set in its day', () => {
    const groups = groupByDay(
      [
        setAt(at(2026, 9, 24, 9, 0), { kind: 'warmup' }),
        setAt(at(2026, 9, 24, 9, 5), { kind: 'working' }),
        setAt(at(2026, 9, 24, 9, 10), { kind: 'drop' }),
        setAt(at(2026, 9, 24, 9, 15), { kind: 'failure' }),
      ],
      NOW,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].sets.map((s) => s.kind)).toEqual(['failure', 'drop', 'working', 'warmup']);
  });

  it('files a future-stamped set under Today instead of inventing a future day', () => {
    const future = setAt(at(2026, 9, 26, 12));
    const today = setAt(at(2026, 9, 24, 9));
    const groups = groupByDay([future, today], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].sets).toEqual([future, today]);
  });

  it('breaks equal timestamps by id, newest id first, whatever the input order', () => {
    const first = setAt(at(2026, 9, 24, 9), { id: 'a' });
    const second = setAt(at(2026, 9, 24, 9), { id: 'b' });
    expect(groupByDay([first, second], NOW)[0].sets).toEqual([second, first]);
    expect(groupByDay([second, first], NOW)[0].sets).toEqual([second, first]);
  });

  it('gives the same answer whatever order the sets arrive in', () => {
    const sets = [
      setAt(at(2026, 9, 24, 9)),
      setAt(at(2026, 9, 22, 9)),
      setAt(at(2026, 9, 22, 19)),
      setAt(at(2026, 9, 1, 9)),
    ];
    expect(groupByDay([...sets].reverse(), NOW)).toEqual(groupByDay(sets, NOW));
  });

  it('does not mutate its input', () => {
    const sets = [setAt(at(2026, 9, 22, 9)), setAt(at(2026, 9, 24, 9))];
    const before = structuredClone(sets);
    groupByDay(sets, NOW);
    expect(sets).toEqual(before);
  });
});
