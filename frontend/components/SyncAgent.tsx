"use client";

import { useInstall } from "@/lib/hooks/useInstall";
import { useSyncAgent } from "@/lib/hooks/useSyncAgent";

// Renders nothing. Mounted once in the app's layout so the background work runs on every screen:
// the backup, and keeping the app installed for offline use. Nothing waits on either.
export function SyncAgent() {
  useSyncAgent();
  useInstall();
  return null;
}
