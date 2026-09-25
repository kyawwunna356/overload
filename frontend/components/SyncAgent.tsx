"use client";

import { useSyncAgent } from "@/lib/hooks/useSyncAgent";

// Renders nothing. Mounted once in the app's layout so the backup runs in the background on
// every screen; nothing waits on it.
export function SyncAgent() {
  useSyncAgent();
  return null;
}
