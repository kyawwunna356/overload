"use client";

import { useMemo } from "react";
import { groupByDay } from "@/lib/domain/history";
import { historyPRs } from "@/lib/domain/prs";
import type { SetLog } from "@/lib/domain/types";
import { formatSet, formatTime, kindLabel } from "@/lib/format";
import { deleteSet } from "@/lib/writes";
import { PRPill } from "./PRPill";
import { SwipeToDelete } from "./SwipeToDelete";

// Every set of this exercise, live, under a heading for each day it was done (Today,
// Yesterday, a weekday, or a date). Seeing a row appear is the confirmation that a tap
// logged; swiping a row left deletes a mistaken one. Deleting asks for no confirmation —
// re-logging a set is a single tap. `now` comes from the caller so "Today" stays right
// after the phone wakes.
//
// A set that broke a record wears a PR pill for good: each set is judged only against the sets
// before it, so beating it later never takes the pill away. Derived every time, never stored.
export function SetHistory({ history, now }: { history: SetLog[]; now: number }) {
  const days = useMemo(() => groupByDay(history, now), [history, now]);
  // Keyed on history alone, so the clock's repaints don't redo the sweep.
  const records = useMemo(() => historyPRs(history), [history]);

  return (
    <section>
      <h2 className="px-2 pb-2 text-xl font-semibold tracking-tight text-ink">History</h2>
      {days.length === 0 ? (
        <p className="rounded-card bg-card px-6 py-5 text-body">No sets yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => (
            <div key={day.day}>
              <h3 className="px-2 pb-2 text-base font-semibold text-body">{day.label}</h3>
              <ul className="divide-y divide-line overflow-hidden rounded-card bg-card">
                {day.sets.map((set) => (
                  <SwipeToDelete
                    key={set.id}
                    onDelete={() => deleteSet(set.id)}
                    className="flex min-h-16 items-center gap-3 px-6 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-lg font-semibold tabular-nums text-ink">
                        {formatSet(set)}
                        <PRPill prs={records.get(set.id)} />
                      </p>
                      {set.kind !== "working" && (
                        <p className="text-sm text-body">{kindLabel(set.kind)}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs tabular-nums text-mute">{formatTime(set.logged_at)}</p>
                    {/* Swiping is for fingers; this is the same delete for VoiceOver and keyboards,
                        out of sight until it has focus. */}
                    <button
                      type="button"
                      aria-label={`Delete ${formatSet(set)} logged at ${formatTime(set.logged_at)}`}
                      onClick={() => void deleteSet(set.id)}
                      className="sr-only shrink-0 rounded-pill font-semibold text-negative-deep focus:not-sr-only focus:px-3 focus:py-2"
                    >
                      Delete
                    </button>
                  </SwipeToDelete>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
