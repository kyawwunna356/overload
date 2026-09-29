'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SESSION_GAP_MINUTES, type DerivedSession } from '../domain/sessions';
import { sessionNumberInWeek, weekRange } from '../domain/week';

// Which session of its week `session` is (1, 2, 3 …), read from Dexie only (Hard Rule 5): the week's
// sets from Monday up to the session's first set, over the logged_at index, and the end markers.
// Undefined until the read completes, or with no session.
export function useSessionNumber(session: DerivedSession | null): number | undefined {
  return useLiveQuery(
    async () => {
      if (session === null) return undefined;
      const { start } = weekRange(session.started_at);
      const sets = await db.set_logs.where('logged_at').between(start, session.started_at, true, true).toArray();
      const markers = (await db.sessions.toArray()).flatMap((row) => (row.ended_at === null ? [] : [row.ended_at]));
      return sessionNumberInWeek(sets, session.started_at, SESSION_GAP_MINUTES, markers);
    },
    [session?.id, session?.started_at],
  );
}
