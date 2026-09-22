'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PATTERNS, type Exercise, type Pattern } from '../domain/types';

export type CatalogueGroup = {
  pattern: Pattern;
  exercises: Exercise[];
};

export type Catalogue = {
  // One group per pattern, in PATTERNS order, each in catalogue order (how the seed lists them,
  // roughly heaviest first). Never empty: every pattern has something to offer.
  groups: CatalogueGroup[];
  // The exercise ids already on your list, so a row can show it's yours.
  listed: Set<string>;
  // Everything on your list, in the order you put it in. Filter by pattern for one group's order.
  yours: Exercise[];
};

// Everything the picker shows, read from Dexie only (Hard Rule 5). Returns undefined until the
// first read finishes. useLiveQuery re-runs it when you add or remove one, so a tapped row
// updates itself without any wiring.
export function useCatalogue(): Catalogue | undefined {
  return useLiveQuery(async () => {
    const all = await db.exercises.toArray();
    const template = await db.templates.filter((row) => row.is_default).first();
    const items = template
      ? await db.template_items.where('template_id').equals(template.id).toArray()
      : [];

    const available = all.filter((exercise) => !exercise.archived);
    const byId = new Map(available.map((exercise) => [exercise.id, exercise]));
    return {
      groups: PATTERNS.map((pattern) => ({
        pattern,
        exercises: available.filter((exercise) => exercise.pattern === pattern),
      })),
      listed: new Set(items.map((item) => item.exercise_id)),
      yours: [...items]
        .sort((a, b) => a.sort_order - b.sort_order || (a.exercise_id < b.exercise_id ? -1 : 1))
        .flatMap((item) => {
          const exercise = byId.get(item.exercise_id);
          return exercise ? [exercise] : [];
        }),
    };
  }, []);
}
