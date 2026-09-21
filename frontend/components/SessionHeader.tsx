"use client";

import { elapsed, formatElapsed } from "@/lib/domain/timers";
import { useActiveSession } from "@/lib/hooks/useActiveSession";

// The session timer: how long since the first set of the session you're in. Deliberately small
// and grey — the rest timer is the prominent one, and two prominent counters never share a
// screen. Renders nothing when there's no active session, because there is no "start": the
// first set you log opens one. It owns its own repaint clock, so only this text re-renders
// each tick.
export function SessionHeader() {
  const state = useActiveSession();
  if (!state?.session) return null;

  return (
    <p className="text-sm tabular-nums text-body">
      Session {formatElapsed(elapsed(state.session.started_at, state.now))}
    </p>
  );
}
