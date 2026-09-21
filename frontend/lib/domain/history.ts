import type { SetLog } from './types';

// An exercise's sets grouped by the day they were done, for the history list on its page.
// Days are LOCAL calendar days (the phone's timezone), so a set logged at 12:30 am belongs to
// the new day. Pure: `now` is passed in, and turning a timestamp into a local date is a
// calculation rather than reading the clock.

export type DayGroup = {
  // Local calendar day as YYYY-MM-DD; also the sort key.
  day: string;
  // "Today", "Yesterday", "Thursday", "13 Sep", "13 Sep 2025".
  label: string;
  // Newest first.
  sets: SetLog[];
};

// Fixed English names: the labels never depend on the phone's language setting.
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_MS = 24 * 60 * 60 * 1000;

// Groups sets by local day, newest day first and newest set first within a day. A set stamped
// in the future (clock skew) is treated as happening now, so it lands under "Today".
export function groupByDay(sets: readonly SetLog[], now: number): DayGroup[] {
  const byDay = new Map<string, SetLog[]>();
  for (const set of sets) {
    const day = dayKey(localDate(Math.min(set.logged_at, now)));
    const bucket = byDay.get(day);
    if (bucket) bucket.push(set);
    else byDay.set(day, [set]);
  }

  return [...byDay.entries()]
    .map(([day, group]) => ({
      day,
      label: dayLabel(Math.min(group[0].logged_at, now), now),
      sets: [...group].sort(newestFirst),
    }))
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

// The heading for the day a timestamp falls on, relative to `now`:
//   today            -> "Today"
//   yesterday        -> "Yesterday"
//   2-6 days ago     -> the weekday, "Thursday" (a rolling week, so a weekday name is never ambiguous)
//   7 or more days   -> the short date, "13 Sep" (plus the year if it isn't this year)
export function dayLabel(timestamp: number, now: number): string {
  const day = localDate(Math.min(timestamp, now));
  const today = localDate(now);
  const daysAgo = dayNumber(today) - dayNumber(day);

  if (daysAgo <= 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return WEEKDAYS[new Date(day.year, day.month, day.date).getDay()];

  const date = `${day.date} ${MONTHS[day.month]}`;
  return day.year === today.year ? date : `${date} ${day.year}`;
}

type LocalDate = { year: number; month: number; date: number };

function localDate(timestamp: number): LocalDate {
  const d = new Date(timestamp);
  return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() };
}

// Whole days since 1970 for a calendar date. Built from UTC so daylight-saving shifts
// (23- and 25-hour days) can't skew the difference between two dates.
function dayNumber(d: LocalDate): number {
  return Date.UTC(d.year, d.month, d.date) / DAY_MS;
}

function dayKey(d: LocalDate): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.year}-${pad(d.month + 1)}-${pad(d.date)}`;
}

// Newest first; equal timestamps fall back to id (UUIDv7 sorts by time) for a stable order.
function newestFirst(a: SetLog, b: SetLog): number {
  return b.logged_at - a.logged_at || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
}
