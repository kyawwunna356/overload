'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

const MOVE_MS = 250;

// Slides list rows to their new places instead of letting them jump (the "FLIP" technique: note
// where each row was, let the layout move it, push it back by the difference, then let it glide
// to zero). Only when `trigger` changes — a row joined or left a block — so ordinary renders, and
// a drag in progress, are left alone. Positions are page positions, so a scroll between renders
// isn't mistaken for a move, and a row caught mid-slide starts from where it visibly is.
//
// Pure presentation: it writes only inline transforms, stores nothing, and does nothing at all
// when the phone asks for reduced motion. Returns a ref for each keyed row.
export function useFlip(trigger: string): (key: string) => (el: HTMLElement | null) => void {
  const elements = useRef(new Map<string, HTMLElement>());
  const seen = useRef(new Map<string, number>());
  const lastTrigger = useRef(trigger);

  useLayoutEffect(() => {
    const changed = lastTrigger.current !== trigger;
    lastTrigger.current = trigger;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const now = new Map<string, number>();
    for (const [key, el] of elements.current) {
      const visible = el.getBoundingClientRect().top + window.scrollY;
      now.set(key, visible);
      if (!changed || reduced) continue;

      const before = seen.current.get(key);
      // Where the layout puts it, without whatever slide is still running.
      const layout = visible - new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
      if (before === undefined || Math.abs(before - layout) < 1) continue;

      el.style.transition = 'none';
      el.style.transform = `translateY(${before - layout}px)`;
      now.set(key, before); // where it visibly is as the slide begins
      requestAnimationFrame(() => {
        el.style.transition = `transform ${MOVE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
        el.style.transform = '';
      });
    }
    seen.current = now;
  });

  return useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) elements.current.set(key, el);
      else elements.current.delete(key);
    },
    [],
  );
}

export const FLIP_MS = MOVE_MS;
