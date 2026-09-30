'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { historyPRs } from '../domain/prs';
import { SESSION_GAP_MINUTES, deriveSessions, type DerivedSession } from '../domain/sessions';
import type { Exercise, SetLog } from '../domain/types';
import { weekRange } from '../domain/week';

const MINUTE_MS = 60_000;

export type HistoryData = {
  // Every session that started in the window, oldest first.
  sessions: DerivedSession[];
  // The exercises those sessions used, for the patterns on each card.
  exercises: Exercise[];
  // Ids of every set in the window that broke a record, judged against all that came before it.
  records: Set<string>;
  // Whether any set was logged before the window, so "Show older" has something to show.
  hasOlder: boolean;
};

// The History tab's last `weeks` weeks (this one included), read from Dexie only (Hard Rule 5).
// Returns undefined until the reads complete, which is milliseconds, so no loading UI is needed.
//
// One read over the logged_at index from the window's first Monday, reaching back one session gap
// so a session that started just before it isn't cut in two; deriveSessions splits the run exactly
// as everywhere else, and sessions that started before the window are dropped. Records need each
// lift's earlier sets too: one indexed read per exercise in the window, up to its last set, as the
// session recap does, then historyPRs judges them all at once. useLiveQuery re-runs it all when a
// set is logged, edited or deleted.
export function useHistory(weeks: number, now: number): HistoryData | undefined {
  const thisWeek = weekRange(now).start;
  const first = new Date(thisWeek);
  // Through the calendar, so a daylight-saving week is still seven days.
  const windowStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() - 7 * (weeks - 1)).getTime();

  return useLiveQuery(async () => {
    const markers = (await db.sessions.toArray()).flatMap((row) =>
      row.ended_at === null ? [] : [row.ended_at],
    );
    const run = await db.set_logs
      .where('logged_at')
      .aboveOrEqual(windowStart - SESSION_GAP_MINUTES * MINUTE_MS)
      .toArray();
    const sessions = deriveSessions(run, SESSION_GAP_MINUTES, markers).filter(
      (session) => session.started_at >= windowStart,
    );
    const inWindow = sessions.flatMap((session) => session.sets);
    const older = await db.set_logs.where('logged_at').below(windowStart).first();

    const exerciseIds = [...new Set(inWindow.map((set) => set.exercise_id))];
    const lastAt = Math.max(0, ...inWindow.map((set) => set.logged_at));
    const histories: SetLog[][] = await Promise.all(
      exerciseIds.map((id) =>
        db.set_logs
          .where('[exercise_id+logged_at]')
          .between([id, Dexie.minKey], [id, lastAt], true, true)
          .toArray(),
      ),
    );
    const found = await db.exercises.bulkGet(exerciseIds);

    return {
      sessions,
      exercises: found.filter((exercise): exercise is Exercise => exercise !== undefined),
      records: new Set(historyPRs(histories.flat()).keys()),
      hasOlder: older !== undefined,
    };
  }, [windowStart]);
}
