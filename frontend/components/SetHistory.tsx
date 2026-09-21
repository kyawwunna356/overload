"use client";

import { useMemo } from "react";
import { groupByDay } from "@/lib/domain/history";
import type { SetLog } from "@/lib/domain/types";
import { formatSet, formatTime, kindLabel } from "@/lib/format";
import { deleteSet } from "@/lib/writes";

// Every set of this exercise, live, under a heading for each day it was done (Today,
// Yesterday, a weekday, or a date). Seeing a row appear is the confirmation that a tap
// logged; the delete button fixes a mistaken one. Deleting asks for no confirmation —
// re-logging a set is a single tap. `now` comes from the caller so "Today" stays right
// after the phone wakes.
export function SetHistory({ history, now }: { history: SetLog[]; now: number }) {
  const days = useMemo(() => groupByDay(history, now), [history, now]);

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
                  <li key={set.id} className="flex min-h-16 items-center gap-3 py-2 pr-3 pl-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold tabular-nums text-ink">
                        {formatSet(set)}
                      </p>
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
