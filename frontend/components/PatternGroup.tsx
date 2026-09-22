"use client";

import type { BoardGroup } from "@/lib/domain/board";
import { patternLabel } from "@/lib/format";
import { ExerciseRow } from "./ExerciseRow";

// A group shows the exercises you picked for that pattern, all of them, in the order you put
// them in — you chose them, so nothing is folded away. A pattern you haven't picked for yet
// says so rather than disappearing.
export function PatternGroup({ group }: { group: BoardGroup }) {
  return (
    <section>
      <h2 className="px-2 pb-2 text-xl font-semibold tracking-tight text-ink">
        {patternLabel(group.pattern)}
      </h2>
      <div className="overflow-hidden rounded-card bg-card">
        {group.rows.length === 0 ? (
          <p className="px-6 py-5 text-body">No exercises yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {group.rows.map((row) => (
              <ExerciseRow key={row.exercise.id} row={row} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
