// The arithmetic behind swiping a row left to delete it. The component measures the row and the
// pointer; these decide what that means, so the rules are tested rather than tuned by feel. Pure.

// A swipe only claims the gesture once the finger has clearly moved sideways: past this many
// pixels, and more across than down. Until then the browser keeps scrolling the page.
const LOCK_PX = 10;
// Faster than this leftward (px per ms) counts as a flick…
const FLICK_SPEED = 0.5;
// …but only once it has travelled this far, so a twitch can't delete a set.
const FLICK_MIN_PX = 40;

// Which way the gesture has committed, from the distance since the press: null until the finger
// has moved past the lock distance on either axis, then 'x' for a swipe or 'y' for a scroll. The
// caller decides once and keeps it, so a scroll that drifts sideways never becomes a swipe. An
// exact diagonal goes to the page.
export function gestureAxis(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.abs(dx) <= LOCK_PX && Math.abs(dy) <= LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

// How far the row should sit: left only, never past its own width. Negative is left.
export function swipeOffset(dx: number, width: number): number {
  return Math.max(-width, Math.min(0, dx));
}

// What letting go does: delete past halfway, or on a real flick left; otherwise spring back.
// `velocity` is px per ms, negative leftward.
export function swipeOutcome(dx: number, width: number, velocity: number): 'delete' | 'reset' {
  if (dx <= -width / 2) return 'delete';
  if (velocity <= -FLICK_SPEED && dx <= -FLICK_MIN_PX) return 'delete';
  return 'reset';
}

// Swiping a sheet down to close it — the same decision turned on its side. The sheet follows the
// finger downward only (dragging up does nothing), and letting go closes it past a quarter of its
// height or on a real downward flick; otherwise it springs back up.
const DISMISS_FRACTION = 0.25;

export function dismissOffset(dy: number): number {
  return Math.max(0, dy);
}

export function dismissOutcome(dy: number, height: number, velocity: number): 'close' | 'reset' {
  if (dy >= height * DISMISS_FRACTION) return 'close';
  if (velocity >= FLICK_SPEED && dy >= FLICK_MIN_PX) return 'close';
  return 'reset';
}
