'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  SESSION_GAP_MINUTES,
  deriveSessions,
  startsNewSession,
  summarizeSession,
  type SessionSummary,
} from '../domain/sessions';
import type { Exercise, SetLog } from '../domain/types';

export type SessionSummaryData = {
  // Null when there's no id in the URL or no session contains that set.
  summary: SessionSummary | null;
};

const NOTHING: SessionSummaryData = { summary: null };

// The summary of the session that contains the set `setId` (a session's id is its first set's
// id, which is what the links carry), read from Dexie only (Hard Rule 5). Returns undefined
// until the first read completes.
//
// It walks outward from that set — newer sets oldest-first, older sets newest-first — and stops
// each way at the first split, so the cost is the length of the one session, not the whole log.
// The split test is the domain's startsNewSession and the session itself comes from
// deriveSessions, so the gap rule isn't re-implemented here. "Contains", rather than "starts at",
// means a link still shows the whole session if a Resume has since merged two of them.
export function useSessionSummary(setId: string | null): SessionSummaryData | undefined {
  return useLiveQuery(async () => {
    if (!setId) return NOTHING;
    const anchor = await db.set_logs.get(setId);
    if (!anchor) return NOTHING;

    const markers = (await db.sessions.toArray()).flatMap((row) =>
      row.ended_at === null ? [] : [row.ended_at],
    );

    let newer: SetLog | undefined;
    const older = await db.set_logs
      .where('logged_at')
      .belowOrEqual(anchor.logged_at)
      .reverse()
      .until((set) => {
        const split = newer !== undefined && startsNewSession(set, newer, SESSION_GAP_MINUTES, markers);
        if (!split) newer = set;
        return split;
      })
      .toArray();

    let earlier: SetLog | undefined;
    const later = await db.set_logs
      .where('logged_at')
      .aboveOrEqual(anchor.logged_at)
      .until((set) => {
        const split = earlier !== undefined && startsNewSession(earlier, set, SESSION_GAP_MINUTES, markers);
        if (!split) earlier = set;
        return split;
      })
      .toArray();

    // The anchor is in both halves; keying by id keeps one copy.
    const run = [...new Map([...older, ...later].map((set) => [set.id, set])).values()];
    // deriveSessions sees only this session's sets, so it can't tell which markers belong to a
    // later session. Keep the markers before the next set, or an older session would read as
    // ended by any marker that came after it.
    const lastLoggedAt = Math.max(...run.map((set) => set.logged_at));
    const next = await db.set_logs.where('logged_at').above(lastLoggedAt).first();
    const ownMarkers = next ? markers.filter((marker) => marker < next.logged_at) : markers;

    const session = deriveSessions(run, SESSION_GAP_MINUTES, ownMarkers).find((candidate) =>
      candidate.sets.some((set) => set.id === setId),
    );
    if (!session) return NOTHING;

    const found = await db.exercises.bulkGet([...new Set(session.sets.map((set) => set.exercise_id))]);
    const exercises = found.filter((exercise): exercise is Exercise => exercise !== undefined);
    return { summary: summarizeSession(session, exercises) };
  }, [setId]);
}
