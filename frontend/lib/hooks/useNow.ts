'use client';

import { useEffect, useState } from 'react';

// The current time as state. It's only ever *read* from the clock — never counted — and
// re-read whenever the page becomes visible again, so "days ago" snaps correct after the
// phone wakes (Hard Rule 4). No interval is needed at day granularity.
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);
  return now;
}
