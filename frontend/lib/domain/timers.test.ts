import { describe, expect, it } from 'vitest';
import { elapsed, formatDuration, formatElapsed } from './timers';

const T0 = 1_000_000_000_000;

describe('elapsed', () => {
  it('is 0 at the same instant', () => {
    expect(elapsed(T0, T0)).toBe(0);
  });

  it('counts whole seconds', () => {
    expect(elapsed(T0, T0 + 42_000)).toBe(42);
  });

  it('rounds down, so it never runs ahead of the clock', () => {
    expect(elapsed(T0, T0 + 999)).toBe(0);
    expect(elapsed(T0, T0 + 1_000)).toBe(1);
    expect(elapsed(T0, T0 + 59_999)).toBe(59);
  });

  it('is a pure function of the two timestamps, so asking again later just gives the later value', () => {
    expect(elapsed(T0, T0 + 5 * 60_000)).toBe(300);
    expect(elapsed(T0, T0 + 95 * 60_000)).toBe(5700);
  });

  it('reads 0 for a timestamp in the future instead of going negative', () => {
    expect(elapsed(T0 + 5_000, T0)).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('shows seconds under a minute with a leading zero', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7)).toBe('0:07');
    expect(formatElapsed(59)).toBe('0:59');
  });

  it('rolls over to minutes at 60 seconds', () => {
    expect(formatElapsed(60)).toBe('1:00');
    expect(formatElapsed(2530)).toBe('42:10');
  });

  it('stays minutes:seconds up to 59:59', () => {
    expect(formatElapsed(3599)).toBe('59:59');
  });

  it('adds hours from one hour, padding the minutes', () => {
    expect(formatElapsed(3600)).toBe('1:00:00');
    expect(formatElapsed(4329)).toBe('1:12:09');
    expect(formatElapsed(5400)).toBe('1:30:00');
  });

  it('reads 0:00 for a negative input', () => {
    expect(formatElapsed(-5)).toBe('0:00');
  });

  it('rounds a fractional input down', () => {
    expect(formatElapsed(59.9)).toBe('0:59');
  });
});

describe('formatDuration', () => {
  it('says "under 1 min" for less than a minute, including zero', () => {
    expect(formatDuration(0)).toBe('under 1 min');
    expect(formatDuration(59_999)).toBe('under 1 min');
  });

  it('shows whole minutes under an hour, rounded down', () => {
    expect(formatDuration(60_000)).toBe('1 min');
    expect(formatDuration(42 * 60_000 + 59_000)).toBe('42 min');
    expect(formatDuration(59 * 60_000 + 59_999)).toBe('59 min');
  });

  it('switches to hours at exactly one hour, padding the minutes', () => {
    expect(formatDuration(60 * 60_000)).toBe('1h 00m');
    expect(formatDuration(67 * 60_000)).toBe('1h 07m');
    expect(formatDuration(150 * 60_000)).toBe('2h 30m');
  });

  it('reads "under 1 min" for a negative input', () => {
    expect(formatDuration(-5_000)).toBe('under 1 min');
  });
});
