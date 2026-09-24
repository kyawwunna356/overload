"use client";

import { useEffect, useState } from "react";

// A number that rolls up from 0 to `target` over `durationMs`, easing out so it slows as it
// lands — a scoreboard, for the finish moment. A display animation, not a timer: nothing is
// counted or stored, each frame is worked out from how far through the duration it is. With
// reduced motion asked for, it lands on the target on the first frame.
export function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start: number | null = null;
    const tick = (time: number) => {
      start ??= time;
      const progress = reduce ? 1 : Math.min(1, (time - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
