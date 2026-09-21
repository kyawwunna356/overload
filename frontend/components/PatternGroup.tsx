"use client";

import { useState } from "react";
import type { BoardGroup } from "@/lib/domain/board";
import { patternLabel } from "@/lib/format";
import { ExerciseRow } from "./ExerciseRow";

// A group shows its most recent picks and folds the rest away, so the board is never a
// flat list of every exercise. Expanded/collapsed is throwaway UI state, not data.
const COLLAPSED_COUNT = 3;

export function PatternGroup({ group }: { group: BoardGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = group.rows.length - COLLAPSED_COUNT;
  const visible = expanded ? group.rows : group.rows.slice(0, COLLAPSED_COUNT);

  return (
    <section>
      <h2 className="px-2 pb-2 text-xl font-semibold tracking-tight text-ink">
        {patternLabel(group.pattern)}
      </h2>
      <div className="overflow-hidden rounded-card bg-card">
        <ul className="divide-y divide-line">
          {visible.map((row) => (
            <ExerciseRow key={row.exercise.id} row={row} />
          ))}
        </ul>
        {hidden > 0 && (
          <div className="border-t border-line p-3">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
              className="h-12 w-full rounded-pill bg-page text-base font-semibold text-ink active:bg-line"
            >
              {expanded ? "Show less" : `Show ${hidden} more`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
