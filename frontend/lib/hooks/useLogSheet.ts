'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { previousSet } from '../domain/previous';
import type { Exercise, SetLog } from '../domain/types';

export const RECENT_SET_COUNT = 5;

export type LogSheetData = {
  // Null when there's no id in the URL or no exercise with that id.
  exercise: Exercise | null;
  // The last WORKING set — what the entry form is prefilled from.
  previous: SetLog | null;
  // The newest sets of any kind, newest first.
  recent: SetLog[];
};

const NOTHING: LogSheetData = { exercise: null, previous: null, recent: [] };

// Everything the log sheet shows, read from Dexie only (Hard Rule 5). Returns undefined
// until the first read completes. Reads go through the [exercise_id+logged_at] index, and
// useLiveQuery re-runs them when a set is logged or deleted.
export function useLogSheet(exerciseId: string | null): LogSheetData | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return NOTHING;
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) return NOTHING;

    const newestFirst = () =>
      db.set_logs
        .where('[exercise_id+logged_at]')
        .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
        .reverse();
    const [recent, latestWorking] = await Promise.all([
      newestFirst().limit(RECENT_SET_COUNT).toArray(),
      newestFirst()
        .filter((log) => log.kind === 'working')
        .first(),
    ]);

    // The newest working set may be older than the recent list, so it's read separately;
    // previousSet() stays the single definition of "previous".
    const candidates = latestWorking ? [...recent, latestWorking] : recent;
    return { exercise, previous: previousSet(exerciseId, candidates), recent };
  }, [exerciseId]);
}
