"use client";

import type { SetLog } from "@/lib/domain/types";
import { formatSet, formatTime, kindLabel } from "@/lib/format";
import { deleteSet } from "@/lib/writes";

// The newest sets of this exercise, live. Seeing a row appear is the confirmation that a
// tap logged; the delete button fixes a mistaken one. Deleting asks for no confirmation —
// re-logging a set is a single tap.
export function RecentSets({ sets }: { sets: SetLog[] }) {
  return (
    <section>
      <h2 className="px-2 pb-2 text-xl font-semibold tracking-tight text-ink">Recent sets</h2>
      <div className="overflow-hidden rounded-card bg-card">
        {sets.length === 0 ? (
          <p className="px-6 py-5 text-body">No sets yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {sets.map((set) => (
              <li key={set.id} className="flex min-h-16 items-center gap-3 py-2 pr-3 pl-6">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold tabular-nums text-ink">{formatSet(set)}</p>
                  <p className="text-sm text-body">
                    {formatTime(set.logged_at)}
                    {set.kind !== "working" && ` · ${kindLabel(set.kind)}`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${formatSet(set)} logged at ${formatTime(set.logged_at)}`}
                  onClick={() => void deleteSet(set.id)}
                  className="h-12 w-12 shrink-0 touch-manipulation rounded-pill text-xl text-negative-deep active:bg-page"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
