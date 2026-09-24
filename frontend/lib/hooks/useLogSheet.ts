'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { masteryLevel, type Mastery } from '../domain/mastery';
import { previousSet } from '../domain/previous';
import type { Exercise, SetLog } from '../domain/types';

export type LogSheetData = {
  // Null when there's no id in the URL or no exercise with that id.
  exercise: Exercise | null;
  // The last WORKING set — what the entry form is prefilled from.
  previous: SetLog | null;
  // Every set of this exercise, of any kind, newest first.
  history: SetLog[];
  // How long you've been doing it, from the same history.
  mastery: Mastery;
};

const NOTHING: LogSheetData = {
  exercise: null,
  previous: null,
  history: [],
  mastery: masteryLevel('', []),
};

// Everything the log sheet shows, read from Dexie only (Hard Rule 5). Returns undefined
// until the first read completes. One indexed read over [exercise_id+logged_at] brings back
// the exercise's whole history; useLiveQuery re-runs it when a set is logged or deleted.
// (A few hundred sets is a year of training on one lift — cheap to read and render.)
export function useLogSheet(exerciseId: string | null): LogSheetData | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return NOTHING;
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) return NOTHING;

    const history = await db.set_logs
      .where('[exercise_id+logged_at]')
      .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
      .reverse()
      .toArray();

    // previousSet() and masteryLevel() stay the single definitions of what they compute.
    return {
      exercise,
      previous: previousSet(exerciseId, history),
      history,
      mastery: masteryLevel(exerciseId, history),
    };
  }, [exerciseId]);
}
