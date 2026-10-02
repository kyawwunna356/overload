import { describe, expect, it } from 'vitest';
import { CUSTOM_NAME_MAX, customName } from './custom';
import { makeExercise } from './test-utils';

describe('customName', () => {
  const bench = makeExercise({ name: 'Bench Press', pattern: 'push' });

  it('tidies the name: trimmed, inner spaces collapsed', () => {
    expect(customName('  Landmine   Press ', [bench])).toEqual({ kind: 'ok', name: 'Landmine Press' });
  });

  it('refuses a blank name', () => {
    expect(customName('', [bench])).toEqual({ kind: 'empty' });
    expect(customName('   ', [bench])).toEqual({ kind: 'empty' });
  });

  it('points at an exercise that already has the name, in any case', () => {
    expect(customName('bench  press', [bench])).toEqual({ kind: 'taken', exercise: bench });
  });

  it('refuses the name whatever pattern you meant it for: one name, one category', () => {
    expect(customName('BENCH PRESS', [bench])).toEqual({ kind: 'taken', exercise: bench });
  });

  it('ignores an archived exercise with the name', () => {
    const archived = makeExercise({ name: 'Old Lift', archived: true });
    expect(customName('Old Lift', [archived])).toEqual({ kind: 'ok', name: 'Old Lift' });
  });

  it('caps the length', () => {
    const result = customName('x'.repeat(CUSTOM_NAME_MAX + 20), []);
    expect(result.kind === 'ok' && result.name.length).toBe(CUSTOM_NAME_MAX);
  });
});
