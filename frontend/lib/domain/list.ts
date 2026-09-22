// Your list: which exercises the board shows, and the order you put them in. It's the one
// thing on the board you choose rather than earn — everything else (last weight, days ago,
// coverage) stays derived from `set_logs`. Stored as `template_items`, so a list entry is a
// template item; Hard Rule 3 still holds, because the list decides what appears and in what
// order and has no say over what can be logged.
//
// Pure: these functions hand back plain values for lib/writes.ts to store.

// One entry in your list. `template_items` rows satisfy this structurally.
export type ListItem = {
  exercise_id: string;
  // Lower comes first. Only compared within a pattern group, but kept unique across the whole
  // list so a new entry can never tie with an existing one.
  sort_order: number;
};

// Where a newly added exercise goes: after everything already in the list, so adding never
// disturbs an order you set. Starts at 0 for an empty list.
export function nextSortOrder(list: readonly ListItem[]): number {
  return list.reduce((next, item) => Math.max(next, item.sort_order + 1), 0);
}

// One step up or down within a group, as a new order of the same ids. At either end, or for
// an id that isn't in the group, the order comes back unchanged — moving is always allowed to
// be tapped, it just has nothing to do. The caller writes the result back as sort_order by
// index, so positions stay dense (0, 1, 2 …) however often you reorder.
export function movePick(
  orderedIds: readonly string[],
  exerciseId: string,
  direction: 'up' | 'down',
): string[] {
  const from = orderedIds.indexOf(exerciseId);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= orderedIds.length) return [...orderedIds];

  const moved = [...orderedIds];
  moved[from] = orderedIds[to];
  moved[to] = orderedIds[from];
  return moved;
}
