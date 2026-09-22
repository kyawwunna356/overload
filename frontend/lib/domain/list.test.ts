import { describe, expect, it } from 'vitest';
import { movePick, nextSortOrder, type ListItem } from './list';

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
