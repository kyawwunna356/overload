import { describe, expect, it } from 'vitest';
import { gestureAxis, swipeOffset, swipeOutcome } from './swipe';

const WIDTH = 360;

describe('gestureAxis', () => {
  it('waits until the finger has moved more than 10px', () => {
    expect(gestureAxis(-10, 0)).toBeNull();
    expect(gestureAxis(-6, 8)).toBeNull();
    expect(gestureAxis(-11, 0)).toBe('x');
    expect(gestureAxis(0, 11)).toBe('y');
  });

  it('gives a mostly vertical drag to the page', () => {
    expect(gestureAxis(-20, 30)).toBe('y');
    expect(gestureAxis(-20, -30)).toBe('y');
  });

  it('claims a mostly horizontal drag, either way', () => {
    expect(gestureAxis(-30, 20)).toBe('x');
    expect(gestureAxis(30, 20)).toBe('x');
  });

  it('gives an exact diagonal to the page', () => {
    expect(gestureAxis(-25, 25)).toBe('y');
  });
});

describe('swipeOffset', () => {
  it('follows the finger left', () => {
    expect(swipeOffset(-120, WIDTH)).toBe(-120);
  });

  it('never moves right', () => {
    expect(swipeOffset(80, WIDTH)).toBe(0);
  });

  it('stops at the row width', () => {
    expect(swipeOffset(-500, WIDTH)).toBe(-WIDTH);
  });
});

describe('swipeOutcome', () => {
  it('deletes once past halfway, even let go slowly', () => {
    expect(swipeOutcome(-180, WIDTH, 0)).toBe('delete');
    expect(swipeOutcome(-181, WIDTH, 0)).toBe('delete');
  });

  it('springs back before halfway when let go slowly', () => {
    expect(swipeOutcome(-179, WIDTH, -0.1)).toBe('reset');
  });

  it('deletes on a quick flick left', () => {
    expect(swipeOutcome(-60, WIDTH, -0.8)).toBe('delete');
  });

  it('ignores a quick twitch that barely moved', () => {
    expect(swipeOutcome(-30, WIDTH, -2)).toBe('reset');
  });

  it('never deletes on a swipe right, however fast', () => {
    expect(swipeOutcome(200, WIDTH, 2)).toBe('reset');
  });

  it('springs back from a flick that turned back right', () => {
    expect(swipeOutcome(-60, WIDTH, 0.8)).toBe('reset');
  });
});
