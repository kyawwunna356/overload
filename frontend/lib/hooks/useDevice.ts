'use client';

import { useSyncExternalStore } from 'react';

// Two facts about the device, read from the browser and never stored.

// Whether the browser thinks there's a network. Only the Me tab asks, to grey out sign-in
// before a tap rather than after it; nothing on the logging path may (Hard Rule 5).
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

// Whether the app is running from the Home Screen rather than a Safari tab. iOS reports it on
// `navigator.standalone`; other browsers through the display-mode media query. The server
// render assumes installed, so the install card never flashes in before the first read.
export function useStandalone(): boolean {
  return useSyncExternalStore(subscribeStandalone, readStandalone, () => true);
}

const STANDALONE = '(display-mode: standalone)';

function readStandalone(): boolean {
  const ios = 'standalone' in navigator && navigator.standalone === true;
  return ios || window.matchMedia(STANDALONE).matches;
}

function subscribeStandalone(onChange: () => void): () => void {
  const query = window.matchMedia(STANDALONE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
