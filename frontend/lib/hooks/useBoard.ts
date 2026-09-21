'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';
import { buildBoard, type BoardGroup } from '../domain/board';
import type { SetLog } from '../domain/types';
import { useNow } from './useNow';

// The board, read from Dexie only (Hard Rule 5). Returns undefined until the first
// read completes, which is milliseconds locally — so no loading UI is needed.
//
// Per exercise it reads just the newest set and the newest working set through the
// [exercise_id+logged_at] index, so cost stays flat as the log grows. useLiveQuery
// re-runs when those rows change, so a logged set shows up without any wiring.
export function useBoard(): BoardGroup[] | undefined {
  const now = useNow();

  const data = useLiveQuery(async () => {
    const exercises = await db.exercises.toArray();
    const logs: SetLog[] = [];
    for (const exercise of exercises) {
      if (exercise.archived) continue;
      const newestFirst = () =>
        db.set_logs
          .where('[exercise_id+logged_at]')
          .between([exercise.id, Dexie.minKey], [exercise.id, Dexie.maxKey])
          .reverse();
      const [latest, latestWorking] = await Promise.all([
        newestFirst().first(),
        newestFirst()
          .filter((log) => log.kind === 'working')
          .first(),
      ]);
      if (latest) logs.push(latest);
      if (latestWorking && latestWorking.id !== latest?.id) logs.push(latestWorking);
    }
    return { exercises, logs };
  }, []);

  return useMemo(
    () => (data ? buildBoard(data.exercises, data.logs, now) : undefined),
    [data, now],
  );
}
