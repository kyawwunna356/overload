import { describe, expect, it } from 'vitest';
import { dropIndex, movePick, nextSortOrder, splitPicks, type ListItem } from './list';

const item = (exercise_id: string, sort_order: number): ListItem => ({ exercise_id, sort_order });

describe('nextSortOrder', () => {
  it('starts an empty list at 0', () => {
    expect(nextSortOrder([])).toBe(0);
  });

  it('puts a new exercise after everything already listed', () => {
    expect(nextSortOrder([item('a', 0), item('b', 1), item('c', 2)])).toBe(3);
  });

  it('follows the highest position, not the count, so gaps never cause a collision', () => {
    expect(nextSortOrder([item('a', 0), item('b', 40)])).toBe(41);
  });

  it('does not depend on the order the rows come back in', () => {
    const list = [item('b', 7), item('a', 2), item('c', 5)];
    expect(nextSortOrder(list)).toBe(8);
    expect(nextSortOrder([...list].reverse())).toBe(8);
  });

  it('stays at 0 or above for negative positions', () => {
    expect(nextSortOrder([item('a', -5)])).toBe(0);
  });

  it('does not mutate the list', () => {
    const list = [item('a', 0), item('b', 1)];
    const before = structuredClone(list);
    nextSortOrder(list);
    expect(list).toEqual(before);
  });
});

describe('movePick', () => {
  const ids = ['a', 'b', 'c'];

  it('moves one step up', () => {
    expect(movePick(ids, 'b', 'up')).toEqual(['b', 'a', 'c']);
    expect(movePick(ids, 'c', 'up')).toEqual(['a', 'c', 'b']);
  });

  it('moves one step down', () => {
    expect(movePick(ids, 'a', 'down')).toEqual(['b', 'a', 'c']);
    expect(movePick(ids, 'b', 'down')).toEqual(['a', 'c', 'b']);
  });

  it('leaves the order alone at either end, so the control is always safe to tap', () => {
    expect(movePick(ids, 'a', 'up')).toEqual(ids);
    expect(movePick(ids, 'c', 'down')).toEqual(ids);
  });

  it('leaves the order alone for an exercise that is not in the group', () => {
    expect(movePick(ids, 'ghost', 'up')).toEqual(ids);
    expect(movePick(ids, 'ghost', 'down')).toEqual(ids);
  });

  it('handles an empty group and a group of one', () => {
    expect(movePick([], 'a', 'up')).toEqual([]);
    expect(movePick(['only'], 'only', 'up')).toEqual(['only']);
    expect(movePick(['only'], 'only', 'down')).toEqual(['only']);
  });

  it('keeps every id exactly once', () => {
    const moved = movePick(ids, 'c', 'up');
    expect([...moved].sort()).toEqual([...ids].sort());
  });

  it('up then down returns to where it started', () => {
    expect(movePick(movePick(ids, 'c', 'up'), 'c', 'down')).toEqual(ids);
  });

  it('walks an exercise to the top one step at a time', () => {
    expect(movePick(movePick(ids, 'c', 'up'), 'c', 'up')).toEqual(['c', 'a', 'b']);
  });

  it('returns a new array and does not mutate the one given', () => {
    const before = [...ids];
    const moved = movePick(ids, 'b', 'up');
    expect(ids).toEqual(before);
    expect(moved).not.toBe(ids);
  });
});

describe('dropIndex', () => {
  // Four rows of the same height, as a group of picks usually is.
  const even = [64, 64, 64, 64];

  it('stays put when the row has not moved', () => {
    expect(dropIndex(even, 1, 0)).toBe(1);
  });

  it('stays put until half of the next row is passed', () => {
    expect(dropIndex(even, 1, 31)).toBe(1);
    expect(dropIndex(even, 1, 33)).toBe(2);
    expect(dropIndex(even, 1, -31)).toBe(1);
    expect(dropIndex(even, 1, -33)).toBe(0);
  });

  it('moves a row at a time as the drag goes on', () => {
    expect(dropIndex(even, 0, 64 + 33)).toBe(2);
    expect(dropIndex(even, 0, 2 * 64 + 33)).toBe(3);
    expect(dropIndex(even, 3, -(64 + 33))).toBe(1);
  });

  it('stops at the end of the list however far the drag goes', () => {
    expect(dropIndex(even, 0, 10_000)).toBe(3);
    expect(dropIndex(even, 3, -10_000)).toBe(0);
  });

  it('follows the real heights when rows differ, e.g. a wrapped name', () => {
    const uneven = [64, 96, 64];
    // The tall row in the middle takes more of a drag to pass.
    expect(dropIndex(uneven, 0, 47)).toBe(0);
    expect(dropIndex(uneven, 0, 49)).toBe(1);
    // Past the tall row, then half of the short one below it.
    expect(dropIndex(uneven, 0, 96 + 33)).toBe(2);
  });

  it('never leaves the list, and a single row has nowhere to go', () => {
    expect(dropIndex([64], 0, 500)).toBe(0);
    expect(dropIndex([64], 0, -500)).toBe(0);
    for (const dy of [-500, -70, -1, 0, 1, 70, 500]) {
      const index = dropIndex(even, 2, dy);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(even.length);
    }
  });

  it('returns the index unchanged when it is not in the list', () => {
    expect(dropIndex(even, 9, 100)).toBe(9);
    expect(dropIndex([], 0, 100)).toBe(0);
  });

  it('does not mutate the heights', () => {
    const heights = [...even];
    dropIndex(heights, 0, 200);
    expect(heights).toEqual(even);
  });
});

describe('splitPicks', () => {
  const ex = (id: string) => ({ id });
  const catalogue = ['a', 'b', 'c', 'd', 'e'].map(ex);
  const ids = (list: { id: string }[]) => list.map((entry) => entry.id);

  it('puts your picks first in your order, and the rest in catalogue order', () => {
    const { onBoard, rest } = splitPicks(catalogue, ['d', 'b'].map(ex));
    expect(ids(onBoard)).toEqual(['d', 'b']);
    expect(ids(rest)).toEqual(['a', 'c', 'e']);
  });

  it('shows every catalogue entry exactly once', () => {
    const { onBoard, rest } = splitPicks(catalogue, ['e', 'a', 'c'].map(ex));
    expect([...ids(onBoard), ...ids(rest)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('is all catalogue with nothing picked', () => {
    const { onBoard, rest } = splitPicks(catalogue, []);
    expect(onBoard).toEqual([]);
    expect(ids(rest)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('leaves out a pick that is not in this catalogue', () => {
    const { onBoard, rest } = splitPicks(catalogue, ['x', 'c'].map(ex));
    expect(ids(onBoard)).toEqual(['c']);
    expect(rest).toHaveLength(4);
  });
});
