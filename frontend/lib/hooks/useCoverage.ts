'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';
import { coverage, type Coverage } from '../domain/coverage';
import { useActiveSession } from './useActiveSession';

// Which patterns the session you're in has touched, read from Dexie only (Hard Rule 5). Null
// when there's no active session (nothing to cover, so the board shows no strip); undefined
// until the first local read finishes. The active session already carries its own sets, so the
// only other read is the exercise list, which says each set's pattern. It's recomputed only when
// the session or the exercises change, not on every clock tick.
export function useCoverage(): Coverage | null | undefined {
  const state = useActiveSession();
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  const loading = state === undefined;
  const session = state?.session ?? null;

  return useMemo(() => {
    if (loading || exercises === undefined) return undefined;
    return session ? coverage(session.sets, exercises) : null;
  }, [loading, session, exercises]);
}
