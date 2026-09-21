import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENTRY,
  parseReps,
  parseWeight,
  prefillFrom,
  stepReps,
  stepWeight,
} from './entry';
import { makeSet } from './test-utils';

describe('stepWeight', () => {
  it('steps by 2.5 kg in either direction', () => {
    expect(stepWeight(80, 1)).toBe(82.5);
    expect(stepWeight(80, -1)).toBe(77.5);
  });

  it('steps from a value that is not a multiple of 2.5', () => {
    expect(stepWeight(81, 1)).toBe(83.5);
    expect(stepWeight(22.25, -1)).toBe(19.75);
  });

  it('never goes below 0 (bodyweight)', () => {
    expect(stepWeight(2.5, -1)).toBe(0);
    expect(stepWeight(0, -1)).toBe(0);
    expect(stepWeight(1, -1)).toBe(0);
  });

  it('never goes above 1000 kg', () => {
    expect(stepWeight(1000, 1)).toBe(1000);
    expect(stepWeight(999, 1)).toBe(1000);
  });

  it('does not accumulate floating-point noise over repeated steps', () => {
    let weight = 0;
    for (let i = 0; i < 40; i++) weight = stepWeight(weight, 1);
    expect(weight).toBe(100);
  });
});

describe('stepReps', () => {
  it('steps by 1 in either direction', () => {
    expect(stepReps(5, 1)).toBe(6);
    expect(stepReps(5, -1)).toBe(4);
  });

  it('never goes below 1 or above 999', () => {
    expect(stepReps(1, -1)).toBe(1);
    expect(stepReps(999, 1)).toBe(999);
  });
});

describe('parseWeight', () => {
  it.each([
    ['82.5', 82.5],
    ['82,5', 82.5],
    ['  90 ', 90],
    ['0', 0],
    ['82.', 82],
    ['12.25', 12.25],
    ['1000', 1000],
  ])('reads %j as %j', (text, expected) => {
    expect(parseWeight(text)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '-5', '+5', '1e3', '82.555', '82.5kg', '8 2', '1001', '.5', '1.2.3'])(
    'rejects %j',
    (text) => {
      expect(parseWeight(text)).toBeNull();
    },
  );
});

describe('parseReps', () => {
  it.each([
    ['5', 5],
    ['  12 ', 12],
    ['999', 999],
  ])('reads %j as %j', (text, expected) => {
    expect(parseReps(text)).toBe(expected);
  });

  it.each(['', '0', '-1', '5.5', '5,5', 'abc', '1000', '1e2', '5 reps'])('rejects %j', (text) => {
    expect(parseReps(text)).toBeNull();
  });
});

describe('prefillFrom', () => {
  it("copies the previous working set's weight and reps", () => {
    const previous = makeSet({ weight: 82.5, reps: 5 });
    expect(prefillFrom(previous)).toEqual({ weight: 82.5, reps: 5 });
  });

  it('falls back to 0 kg × 8 when there is no previous set', () => {
    expect(prefillFrom(null)).toEqual({ weight: 0, reps: 8 });
    expect(prefillFrom(null)).toBe(DEFAULT_ENTRY);
  });

  it('keeps bodyweight as weight 0', () => {
    expect(prefillFrom(makeSet({ weight: 0, reps: 9 }))).toEqual({ weight: 0, reps: 9 });
  });
});
