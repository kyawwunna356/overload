"use client";

import Link from "next/link";
import { dayLabel } from "@/lib/domain/history";
import { elapsed, formatElapsed } from "@/lib/domain/timers";
import { useActiveSession } from "@/lib/hooks/useActiveSession";

// The session timer: how long since the first set of the session you're in, and the way into
// that session's summary. Deliberately small and grey — the rest timer is the prominent one, and
// two prominent counters never share a screen. Renders nothing when there's no active session,
// because there is no "start": the first set you log opens one. It owns its own repaint clock,
// so only this text re-renders each tick.
//
// With `showLast` (the board), an idle app shows "Last session · Thursday" instead, so the most
// recent summary stays reachable after the session has closed.
export function SessionHeader({ showLast = false }: { showLast?: boolean }) {
  const state = useActiveSession();
  if (!state) return null;

  const { session, last, now } = state;
  const target = session ?? (showLast ? last : null);
  if (!target) return null;

  const label = session
    ? `Session ${formatElapsed(elapsed(session.started_at, now))}`
    : `Last session · ${dayLabel(target.started_at, now)}`;

  return (
    // -m-3 p-3 grows the tap area without moving the text.
    <Link
      href={`/session?id=${encodeURIComponent(target.id)}`}
      className="-m-3 touch-manipulation p-3 text-right text-sm tabular-nums text-body active:text-ink"
    >
      {label} ›
    </Link>
  );
}
