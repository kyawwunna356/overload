'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { sessionRecap, type Recap } from '../domain/recap';
import type { DerivedSession } from '../domain/sessions';

// The recap of one session, read from Dexie only (Hard Rule 5). One indexed read per exercise in
// the session, over [exercise_id+logged_at] up to the session's last set — records and levels only
// ever look backwards, so nothing later is needed. Returns undefined until the reads complete.
//
// `session` may be null (the summary hasn't loaded, or there's no such session), so the page can
// call this unconditionally; it then returns undefined.
export function useSessionRecap(session: DerivedSession | null): Recap | undefined {
  return useLiveQuery(
    async () => {
      if (session === null) return undefined;
      const exerciseIds = [...new Set(session.sets.map((set) => set.exercise_id))];
      const histories = await Promise.all(
        exerciseIds.map((id) =>
          db.set_logs
            .where('[exercise_id+logged_at]')
            .between([id, Dexie.minKey], [id, session.last_set_at], true, true)
            .toArray(),
        ),
      );
      return sessionRecap(session, histories.flat());
    },
    // The session object is rebuilt on every read; these say when it actually changed.
    [session?.id, session?.last_set_at, session?.sets.length],
  );
}
