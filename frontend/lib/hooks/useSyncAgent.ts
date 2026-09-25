'use client';

import { useEffect } from 'react';
import { startSync } from '../sync/triggers';

// Starts the background backup once for the app's lifetime (see `lib/sync/triggers.ts`). The UI
// never touches the sync layer itself; this hook is its one way in.
export function useSyncAgent(): void {
  useEffect(() => startSync(), []);
}
