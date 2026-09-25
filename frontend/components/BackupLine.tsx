"use client";

import Link from "next/link";
import { backupLabel } from "@/lib/domain/signin";
import { useBackupStatus } from "@/lib/hooks/useBackupStatus";

// The board's one word on backup, under the last group: quiet, small and grey, because it's
// something to glance at, not to act on mid-set. It reads the outbox and the saved sign-in,
// never the network. Hidden when no Supabase project is configured.
export function BackupLine() {
  const state = useBackupStatus();
  if (!state) return null;

  const mark = state.kind === "signed-out" ? " ›" : state.kind === "backed-up" ? " ✓" : "";

  return (
    <Link
      href="/account"
      className="mx-auto mt-8 flex w-fit touch-manipulation px-4 py-3 text-sm text-mute active:text-ink"
    >
      {backupLabel(state)}
      {mark}
    </Link>
  );
}
