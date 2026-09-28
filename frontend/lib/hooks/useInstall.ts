'use client';

import { useEffect } from 'react';

// Once per launch: register the service worker that keeps the whole app on the phone, so it opens
// with no signal, and ask the browser to keep this site's storage instead of clearing it when
// space runs low (Supabase stays the safety net either way). Both are fire-and-forget: nothing
// waits on them, nothing is stored, nothing is shown. Production only — `pnpm dev` has no
// sw.js, and a service worker there would serve stale code.
export function useInstall(): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
    navigator.storage?.persist().catch(() => false);
  }, []);
}
