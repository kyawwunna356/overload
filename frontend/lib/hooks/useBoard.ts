'use client';

import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';
import { buildBoard, type BoardGroup } from '../domain/board';
import type { ListItem } from '../domain/list';
import type { Exercise, SetLog } from '../domain/types';
import { useActiveSession } from './useActiveSession';
import { useSessionRecap } from './useSessionRecap';

const MINUTE_MS = 60_000;

// The board, read from Dexie only (Hard Rule 5). Returns undefined until the first read
// completes, which is milliseconds locally — so no loading UI is needed.
//
// It reads your list (the default template's items) and then, per listed exercise, just the
// newest set and the newest working set through the [exercise_id+logged_at] index — all a row's
// "Last:" line needs; "Today:" comes from the session's own sets. So the cost follows the length of
// your list, not the catalogue or the history. useLiveQuery re-runs it when a set is logged or the
// list changes, so both show up without any wiring.
export function useBoard(): BoardGroup[] | undefined {
  const state = useActiveSession();

  const data = useLiveQuery(async () => {
    const template = await db.templates.filter((row) => row.is_default).first();
    const list: ListItem[] = template
      ? await db.template_items.where('template_id').equals(template.id).toArray()
      : [];

    const exercises = await db.exercises.bulkGet([...new Set(list.map((item) => item.exercise_id))]);
    const listed = exercises.filter((row): row is Exercise => row !== undefined && !row.archived);
    const logs: SetLog[] = [];
    for (const exercise of listed) {
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

    return { exercises: listed, logs, list };
  }, []);

  // useActiveSession repaints twice a second for the timers. The board only needs the session's
  // sets (the same object until a set is logged or the session ends) and a clock to the minute for
  // "4d", so it's rebuilt on those rather than on every repaint.
  const sessionSets = state?.session?.sets;
  const minute = state === undefined ? undefined : Math.floor(state.now / MINUTE_MS);

  // Which lifts broke a record this session, for the row's PR pill: the recap's own records, so the
  // board, the pop-up and the summary can't disagree. Until it's read, rows show the plain tick.
  const recap = useSessionRecap(state?.session ?? null);
  const recordIds = useMemo(
    () => new Set(recap?.prs.map((entry) => entry.set.exercise_id)),
    [recap],
  );

  return useMemo(
    () =>
      data && minute !== undefined
        ? buildBoard(data.exercises, data.logs, minute * MINUTE_MS, data.list, sessionSets ?? [], recordIds)
        : undefined,
    [data, minute, sessionSets, recordIds],
  );
}
