'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';
import { weekOf, weekRange, type WeekDay } from '../domain/week';
import { useNow } from './useNow';

// The week containing `anchor`, day by day, read from Dexie only (Hard Rule 5). One read over the
// logged_at index covers just that week, and useLiveQuery re-runs it when a set is logged, so a
// first set today turns today green. Returns undefined until the read completes.
export function useWeek(anchor: number): WeekDay[] | undefined {
  const now = useNow();
  const { start, end } = weekRange(anchor);

  const times = useLiveQuery(
    () =>
      db.set_logs
        .where('logged_at')
        .between(start, end, true, false)
        .toArray((sets) => sets.map((set) => set.logged_at)),
    [start, end],
  );

  return useMemo(() => (times === undefined ? undefined : weekOf(anchor, times, now)), [anchor, times, now]);
}
