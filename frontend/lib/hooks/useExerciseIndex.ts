'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Exercise, SetLog } from '../domain/types';

export type ExerciseIndexData = {
  exercises: Exercise[];
  // Per exercise, its newest set and its newest working set — all a row needs.
  latest: SetLog[];
};

// What History's Exercises view reads, from Dexie only (Hard Rule 5). Returns undefined until the
// reads complete. Every exercise (archived ones too: their sets happened), then per exercise just
// its newest set and newest working set through the [exercise_id+logged_at] index, the board's
// pattern, so the cost follows the catalogue, not the history. useLiveQuery re-runs it when a set
// is logged, edited or deleted.
export function useExerciseIndex(): ExerciseIndexData | undefined {
  return useLiveQuery(async () => {
    const exercises = await db.exercises.toArray();
    const latest: SetLog[] = [];
    await Promise.all(
      exercises.map(async (exercise) => {
        const newestFirst = () =>
          db.set_logs
            .where('[exercise_id+logged_at]')
            .between([exercise.id, Dexie.minKey], [exercise.id, Dexie.maxKey])
            .reverse();
        const [newest, newestWorking] = await Promise.all([
          newestFirst().first(),
          newestFirst()
            .filter((set) => set.kind === 'working')
            .first(),
        ]);
        if (newest) latest.push(newest);
        if (newestWorking && newestWorking.id !== newest?.id) latest.push(newestWorking);
      }),
    );
    return { exercises, latest };
  }, []);
}
