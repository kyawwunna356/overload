import { dayKey, localDate } from './history';

// The week a session belongs to, as seven local calendar days, Monday first — for the strip on the
// session summary. A day is "trained" when any set was logged on it. There is no target and no
// count: a day off is just a day, never a gap to fill. Pure: `now` is passed in.

export type WeekDay = {
  // Local calendar day as YYYY-MM-DD.
  key: string;
  // "M", "T" … for the strip; the full name is for screen readers.
  initial: string;
  name: string;
  // Day of the month, 1–31.
  date: number;
  trained: boolean;
  // The day of the session being viewed.
  anchor: boolean;
  // Later than today.
  future: boolean;
};

const DAYS = [
  ['M', 'Monday'],
  ['T', 'Tuesday'],
  ['W', 'Wednesday'],
  ['T', 'Thursday'],
  ['F', 'Friday'],
  ['S', 'Saturday'],
  ['S', 'Sunday'],
] as const;

// Local Monday 00:00 of the week containing `anchor`, and the Monday after — the span to read.
// Built with the local Date constructor, so a daylight-saving week is still seven calendar days.
export function weekRange(anchor: number): { start: number; end: number } {
  const monday = mondayOf(anchor);
  return {
    start: new Date(monday.year, monday.month, monday.date).getTime(),
    end: new Date(monday.year, monday.month, monday.date + 7).getTime(),
  };
}

// The seven days of the week containing `anchor`. `setTimes` may include sets outside the week;
// they're ignored. A set stamped in the future (clock skew) counts as today, as in groupByDay.
export function weekOf(anchor: number, setTimes: readonly number[], now: number): WeekDay[] {
  const trainedDays = new Set(setTimes.map((time) => dayKey(localDate(Math.min(time, now)))));
  const anchorKey = dayKey(localDate(anchor));
  const todayKey = dayKey(localDate(now));
  const monday = mondayOf(anchor);

  return DAYS.map(([initial, name], offset) => {
    const day = localDate(new Date(monday.year, monday.month, monday.date + offset).getTime());
    const key = dayKey(day);
    return {
      key,
      initial,
      name,
      date: day.date,
      trained: trainedDays.has(key),
      anchor: key === anchorKey,
      // YYYY-MM-DD compares correctly as a string.
      future: key > todayKey,
    };
  });
}

function mondayOf(timestamp: number) {
  const d = new Date(timestamp);
  // getDay: Sunday 0 … Saturday 6. Days since Monday: Monday 0 … Sunday 6.
  const sinceMonday = (d.getDay() + 6) % 7;
  return localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday).getTime());
}
