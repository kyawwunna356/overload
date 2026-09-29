'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';
import { buildBoard, type BoardGroup } from '../domain/board';
import type { ListItem } from '../domain/list';
import type { Exercise, SetLog } from '../domain/types';
import { useActiveSession } from './useActiveSession';

const MINUTE_MS = 60_000;

// The board, read from Dexie only (Hard Rule 5). Returns undefined until the first read
// completes, which is milliseconds locally — so no loading UI is needed.
//
// It reads your list (the default template's items) and then every set of each listed exercise
// through the [exercise_id+logged_at] index, since a row's level counts the days you did it. So the
// cost follows your list's history, not the whole catalogue's. useLiveQuery re-runs it when a set
// is logged or the list changes, so both show up without any wiring.
export function useBoard(): BoardGroup[] | undefined {
  const state = useActiveSession();

  const data = useLiveQuery(async () => {
    const template = await db.templates.filter((row) => row.is_default).first();
    const list: ListItem[] = template
      ? await db.template_items.where('template_id').equals(template.id).toArray()
      : [];

    const exercises = await db.exercises.bulkGet([...new Set(list.map((item) => item.exercise_id))]);
    const listed = exercises.filter((row): row is Exercise => row !== undefined && !row.archived);
    const histories = await Promise.all(
      listed.map((exercise) =>
        db.set_logs
          .where('[exercise_id+logged_at]')
          .between([exercise.id, Dexie.minKey], [exercise.id, Dexie.maxKey])
          .toArray(),
      ),
    );
    const logs: SetLog[] = histories.flat();

    return { exercises: listed, logs, list };
  }, []);

  // useActiveSession repaints twice a second for the timers. The board only needs the session's
  // sets (the same object until a set is logged or the session ends) and a clock to the minute for
  // "4d", so it's rebuilt on those rather than on every repaint.
  const sessionSets = state?.session?.sets;
  const minute = state === undefined ? undefined : Math.floor(state.now / MINUTE_MS);

  return useMemo(
    () =>
      data && minute !== undefined
        ? buildBoard(data.exercises, data.logs, minute * MINUTE_MS, data.list, sessionSets ?? [])
        : undefined,
    [data, minute, sessionSets],
  );
}
