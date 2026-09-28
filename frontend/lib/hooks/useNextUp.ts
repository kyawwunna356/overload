'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db';
import { buildBoard, nextUp } from '../domain/board';
import type { Exercise } from '../domain/types';
import { useActiveSession } from './useActiveSession';

// The log sheet's "Next up": the next exercise on your board, in board order, that has no set in
// the session you're in. Read from Dexie only (Hard Rule 5); the order comes from buildBoard, so
// it's exactly the board's. Display only — it never limits what you can log (Hard Rule 3). Null
// with no active session, or when everything else on the board is done.
export function useNextUp(exerciseId: string): Exercise | null {
  const active = useActiveSession();

  const board = useLiveQuery(async () => {
    const template = await db.templates.filter((row) => row.is_default).first();
    const list = template ? await db.template_items.where('template_id').equals(template.id).toArray() : [];
    const exercises = await db.exercises.bulkGet([...new Set(list.map((item) => item.exercise_id))]);
    return { list, exercises: exercises.filter((row) => row !== undefined) };
  }, []);

  const session = active?.session ?? null;
  return useMemo(() => {
    if (!board || !session) return null;
    // No sets passed: only the order is needed, and it never depends on them.
    const rows = buildBoard(board.exercises, [], 0, board.list).flatMap((group) => group.rows);
    const done = new Set(session.sets.map((set) => set.exercise_id));
    const id = nextUp(rows.map((row) => row.exercise.id), done, exerciseId);
    return rows.find((row) => row.exercise.id === id)?.exercise ?? null;
  }, [board, session, exerciseId]);
}
