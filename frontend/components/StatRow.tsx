import type { ReactNode } from "react";
import { formatDuration } from "@/lib/domain/timers";

// A session at a glance — Duration · Sets · kg lifted — on the summary and the finish deck's first
// card. The values come in formatted (the deck rolls the kg up; the summary's duration may count
// live), so this only lays them out.
export function StatRow({ duration, sets, kg }: { duration: ReactNode; sets: ReactNode; kg: ReactNode }) {
  return (
    <dl className="grid grid-cols-3 rounded-card bg-card px-2 py-5">
      <Stat label="Duration">{duration}</Stat>
      <Stat label="Sets">{sets}</Stat>
      <Stat label="kg lifted">{kg}</Stat>
    </dl>
  );
}

// The label comes first for screen readers ("Duration, 1h 12m") and sits under the value on screen.
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <dt className="order-2 text-sm text-body">{label}</dt>
      <dd className="order-1 font-display text-[1.75rem] leading-none font-black tracking-tight tabular-nums text-ink">
        {children}
      </dd>
    </div>
  );
}

// A finished session's length for a tile or a line: "42 min", "1h 12m", and "<1 min" rather than
// the longer "under 1 min", which doesn't fit a tile.
export function durationText(ms: number): string {
  return ms < 60_000 ? "<1 min" : formatDuration(ms);
}
