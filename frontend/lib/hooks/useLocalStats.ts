'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SESSION_GAP_MINUTES, deriveSessions } from '../domain/sessions';

export type LocalStats = { sets: number; sessions: number };

// How much training this phone holds, for the Me tab: every set, and the sessions derived from
// them by the gap rule (Hard Rule 2) — never a stored count. Read from Dexie only, live, so it
// moves the moment a set is logged or a restore lands. Undefined until the read completes.
// Reading every set is fine at this size: a few thousand rows is years of training.
export function useLocalStats(): LocalStats | undefined {
  return useLiveQuery(async () => {
    const [sets, markers] = await Promise.all([db.set_logs.toArray(), db.sessions.toArray()]);
    const ends = markers.flatMap((row) => (row.ended_at === null ? [] : [row.ended_at]));
    return {
      sets: sets.length,
      sessions: deriveSessions(sets, SESSION_GAP_MINUTES, ends).length,
    };
  }, []);
}
