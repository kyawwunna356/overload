import { coverage } from './coverage';
import { summarizeSession, type DerivedSession } from './sessions';
import { PATTERNS, type Exercise, type Pattern } from './types';
import { weekOf, weekRange, type WeekDay } from './week';

// The History tab's sessions: grouped by week, newest first, each as a card of plain facts. It
// answers "what did I do on Thursday" and nothing more — no weekly totals, no streak, no target,
// and no session is compared with another. Derived from the sessions every time (Hard Rule 1).
// Pure: `now` is passed in (Hard Rule 6). Its own file because week.ts already imports history.ts.

export type HistoryWeek = {
  // Local Monday 00:00 of the week — also its React key.
  start: number;
  // "This week", "Last week", "15 – 21 Sep", "28 Dec 2026 – 3 Jan 2027".
  label: string;
  // Monday to Sunday; a day is trained when one of the week's sessions started on it.
  days: WeekDay[];
  // Newest first.
  sessions: DerivedSession[];
};

// Sessions grouped by the week they started in (a Sunday-night session stays in its week), newest
// week first. A week with no session isn't there at all: history lists what happened, not gaps.
export function sessionWeeks(sessions: readonly DerivedSession[], now: number): HistoryWeek[] {
  const byWeek = new Map<number, DerivedSession[]>();
  for (const session of sessions) {
    const { start } = weekRange(session.started_at);
    const bucket = byWeek.get(start);
    if (bucket) bucket.push(session);
    else byWeek.set(start, [session]);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => b - a)
    .map(([start, group]) => {
      const newest = [...group].sort((a, b) => b.started_at - a.started_at);
      return {
        start,
        label: weekLabel(start, now),
        days: weekOf(start, newest.map((session) => session.started_at), now),
        sessions: newest,
      };
    });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A week's heading. The week `now` is in reads "This week", the one before "Last week"; any other
// is its Monday to Sunday, "15 – 21 Sep" or "28 Sep – 4 Oct", with the year when it isn't this one.
export function weekLabel(weekStart: number, now: number): string {
  const thisWeek = weekRange(now).start;
  if (weekStart === thisWeek) return 'This week';
  // The Monday before, found through the calendar so a daylight-saving week still matches.
  if (weekStart === weekRange(thisWeek - 1).start) return 'Last week';

  const first = new Date(weekStart);
  const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6);
  const year = new Date(now).getFullYear();
  const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const withYear = (d: Date) => (d.getFullYear() === year ? dayMonth(d) : `${dayMonth(d)} ${d.getFullYear()}`);

  if (first.getFullYear() !== last.getFullYear()) return `${withYear(first)} – ${withYear(last)}`;
  const from = first.getMonth() === last.getMonth() ? String(first.getDate()) : dayMonth(first);
  return `${from} – ${withYear(last)}`;
}

export type SessionCard = {
  // The session's id (its first set's), which the summary link carries.
  id: string;
  started_at: number;
  // The end of the workout: when you finished, or the last set when the gap closed it.
  end: number;
  durationMs: number;
  sets: number;
  exercises: number;
  // The patterns it touched, in board order.
  patterns: Pattern[];
  // How many of its sets broke a record.
  records: number;
};

// One session's card. `records` holds the ids of every set that broke a record, judged across the
// whole history (historyPRs); only this session's own sets are counted.
export function sessionCard(
  session: DerivedSession,
  exercises: readonly Exercise[],
  records: ReadonlySet<string>,
): SessionCard {
  const summary = summarizeSession(session, exercises);
  const touched = coverage(session.sets, exercises);
  return {
    id: session.id,
    started_at: session.started_at,
    end: session.ended_at ?? session.last_set_at,
    durationMs: summary.durationMs,
    sets: summary.setCount,
    exercises: summary.exerciseCount,
    patterns: PATTERNS.filter((pattern) => touched[pattern]),
    records: session.sets.filter((set) => records.has(set.id)).length,
  };
}
