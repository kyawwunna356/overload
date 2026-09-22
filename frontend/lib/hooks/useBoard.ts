'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';
import { buildBoard, type BoardGroup } from '../domain/board';
import type { ListItem } from '../domain/list';
import type { SetLog } from '../domain/types';
import { useNow } from './useNow';

// The board, read from Dexie only (Hard Rule 5). Returns undefined until the first read
// completes, which is milliseconds locally — so no loading UI is needed.
//
// It reads your list (the default template's items) and then, per listed exercise, just the
// newest set and the newest working set through the [exercise_id+logged_at] index. So the cost
// follows the length of your list, not the catalogue or the history. useLiveQuery re-runs it
// when a set is logged or the list changes, so both show up without any wiring.
export function useBoard(): BoardGroup[] | undefined {
  const now = useNow();

  const data = useLiveQuery(async () => {
    const template = await db.templates.filter((row) => row.is_default).first();
    const list: ListItem[] = template
      ? await db.template_items.where('template_id').equals(template.id).toArray()
      : [];

    const exercises = await db.exercises.bulkGet([...new Set(list.map((item) => item.exercise_id))]);
    const logs: SetLog[] = [];
    for (const exercise of exercises) {
      if (exercise === undefined || exercise.archived) continue;
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

    return { exercises: exercises.filter((row) => row !== undefined), logs, list };
  }, []);

  return useMemo(
    () => (data ? buildBoard(data.exercises, data.logs, now, data.list) : undefined),
    [data, now],
  );
}
