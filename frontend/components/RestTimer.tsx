"use client";

import { elapsed, formatElapsed } from "@/lib/domain/timers";
import { useActiveSession } from "@/lib/hooks/useActiveSession";

// The rest timer: how long since your last set, of any exercise. It only counts up — no
// target, no "rest done", no expiry — so it informs and never prescribes. Renders nothing when
// there's no active session.
export function RestTimer() {
  const state = useActiveSession();
  if (!state?.session) return null;

  return (
    <div className="text-right">
      <p className="text-sm text-body">Rest</p>
      <p className="text-3xl font-black leading-none tabular-nums text-ink">
        {formatElapsed(elapsed(state.session.last_set_at, state.now))}
      </p>
    </div>
  );
}
