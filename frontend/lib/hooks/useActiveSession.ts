'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';
import {
  SESSION_GAP_MINUTES,
  activeSession,
  deriveSessions,
  startsNewSession,
  type DerivedSession,
} from '../domain/sessions';
import type { SetLog } from '../domain/types';
import { useNow } from './useNow';

// How often the timers repaint. Twice a second so a displayed second can never be skipped;
// every repaint re-reads the clock, so this is only a trigger, never the source of truth.
const REPAINT_MS = 500;

export type ActiveSessionState = {
  // The session you're in right now, or null when there isn't one.
  session: DerivedSession | null;
  // The most recent session, active or not — what "Last session" links to. Null with no sets.
  last: DerivedSession | null;
  // The clock reading this render is based on. Timers subtract from it (Hard Rule 4).
  now: number;
};

// The current session and the time, read from Dexie only (Hard Rule 5). Returns undefined
// until the first local read finishes, which is milliseconds, so no loading UI is needed.
//
// It walks the log newest-first and stops at the first split, so the cost is the length of the
// current session rather than the whole history. The split test is the domain's own
// startsNewSession, and the session itself comes from deriveSessions — this hook never
// re-implements the gap rule. Whether that session is still *active* depends on the clock, so
// that's decided per render by activeSession(); nothing about it is stored.
export function useActiveSession(): ActiveSessionState | undefined {
  const now = useNow(REPAINT_MS);

  const latest = useLiveQuery(async () => {
    const markers = (await db.sessions.toArray()).flatMap((row) =>
      row.ended_at === null ? [] : [row.ended_at],
    );

    let newer: SetLog | undefined;
    const run = await db.set_logs
      .orderBy('logged_at')
      .reverse()
      .until((set) => {
        const split = newer !== undefined && startsNewSession(set, newer, SESSION_GAP_MINUTES, markers);
        if (!split) newer = set;
        return split;
      })
      .toArray();

    // Wrapped so "still loading" (undefined) differs from "no sets at all" (session: null).
    return { session: deriveSessions(run, SESSION_GAP_MINUTES, markers).at(-1) ?? null };
  }, []);

  return useMemo(
    () =>
      latest
        ? {
            session: activeSession(latest.session ? [latest.session] : [], now, SESSION_GAP_MINUTES),
            last: latest.session,
            now,
          }
        : undefined,
    [latest, now],
  );
}
