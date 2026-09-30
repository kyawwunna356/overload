"use client";

import { useEffect, useRef } from "react";
import type { PR } from "@/lib/domain/prs";
import type { SetLog } from "@/lib/domain/types";
import { formatSet, formatSetShort, formatTime } from "@/lib/format";
import { PRPill } from "./PRPill";
import { SwipeToDelete } from "./SwipeToDelete";

// Today's sets as a numbered table, each beside the same set from last time (Hevy's PREVIOUS
// column), then the next set to log, lit up. It answers "what did I do last time" set by set,
// not only the final set. Tap a today row to edit it (it gets a lime outline while it's open);
// swipe it left to delete it, as in the history.
//
// "Today" is this exercise's sets in the session you're in; "last time" is its previous session
// (previousSession). Both are derived; nothing here is stored.
const GRID = "grid grid-cols-[2rem_5.5rem_1fr_auto] items-center gap-2";

export function SetTable({
  today,
  lastTime,
  records,
  editingId,
  onEdit,
  onDelete,
}: {
  today: readonly SetLog[];
  lastTime: readonly SetLog[];
  records: ReadonlyMap<string, PR[]>;
  // The set open in the editor, if any.
  editingId: string | null;
  onEdit: (set: SetLog) => void;
  onDelete: (set: SetLog) => Promise<void>;
}) {
  const next = today.length + 1;
  // After a set is logged, the Next set row is scrolled just into view, so the table's end never
  // hides behind the pinned entry. Only when the count grows: an edit or a delete leaves you put.
  const nextRow = useRef<HTMLLIElement>(null);
  const count = useRef(today.length);
  useEffect(() => {
    if (today.length > count.current) nextRow.current?.scrollIntoView({ block: "nearest" });
    count.current = today.length;
  }, [today.length]);
  const lastFor = (n: number) => {
    const set = lastTime[n - 1];
    return set ? formatSetShort(set) : "—";
  };

  return (
    <section aria-label="Sets" className="rounded-card bg-card px-2 pt-4 pb-2">
      <div className={`${GRID} px-4 pb-1 text-xs font-semibold tracking-wide text-mute uppercase`}>
        <span>Set</span>
        <span>Last time</span>
        <span>Today</span>
      </div>
      <ul>
        {today.map((set, i) => (
          <SwipeToDelete
            key={set.id}
            onDelete={() => onDelete(set)}
            onTap={() => onEdit(set)}
            label={`Edit set ${i + 1}, ${formatSet(set)}`}
            frameClassName={set.id === editingId ? "rounded-control" : ""}
            className={`${GRID} min-h-14 px-4 ${
              set.id === editingId ? "rounded-control ring-2 ring-primary ring-inset" : ""
            }`}
          >
            <span className="text-body tabular-nums">{i + 1}</span>
            <span className="text-lg text-mute tabular-nums">{lastFor(i + 1)}</span>
            <span className="text-lg font-semibold text-ink tabular-nums">{formatSetShort(set)}</span>
            <span className="flex items-center justify-end">
              {records.has(set.id) ? (
                <PRPill prs={records.get(set.id)} />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-label="Logged">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              )}
              <button
                type="button"
                aria-label={`Delete set ${i + 1}, ${formatSet(set)} at ${formatTime(set.logged_at)}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void onDelete(set);
                }}
                className="sr-only rounded-pill font-semibold text-negative-deep focus:not-sr-only focus:px-3 focus:py-2"
              >
                Delete
              </button>
            </span>
          </SwipeToDelete>
        ))}
        <li ref={nextRow} className={`${GRID} min-h-14 rounded-control bg-primary-pale px-4`}>
          <span className="font-semibold text-primary tabular-nums">{next}</span>
          <span className="text-lg text-mute tabular-nums">{lastFor(next)}</span>
          <span className="text-lg font-semibold text-primary">Next set</span>
          <span />
        </li>
      </ul>
    </section>
  );
}
