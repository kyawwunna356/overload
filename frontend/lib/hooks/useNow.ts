'use client';

import { useEffect, useState } from 'react';

// The current time as state. It's only ever *read* from the clock — never counted — and
// re-read whenever the page becomes visible again, so what's on screen snaps correct after
// the phone wakes (Hard Rule 4).
//
// With no argument the clock refreshes only on visibilitychange, which is enough for "days
// ago". A timer passes `intervalMs` to repaint while it's on screen: each tick just calls
// Date.now() again — it never adds to a stored value — and the interval is stopped while the
// page is hidden.
export function useNow(intervalMs?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (intervalMs !== undefined && timer === undefined) {
        timer = setInterval(() => setNow(Date.now()), intervalMs);
      }
    };
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    const sync = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      stop();
    };
  }, [intervalMs]);
  return now;
}
