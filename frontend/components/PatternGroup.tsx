"use client";

import Link from "next/link";
import type { BoardGroup } from "@/lib/domain/board";
import { patternLabel } from "@/lib/format";
import { ExerciseRow } from "./ExerciseRow";

// A group shows the exercises you picked for that pattern, all of them, in the order you put
// them in — you chose them, so nothing is folded away. A pattern you haven't picked for yet says
// so and offers the catalogue, which is the only thing to do there; once a group has exercises
// that becomes a plus beside the heading instead, so the card stays a list of lifts.
export function PatternGroup({ group }: { group: BoardGroup }) {
  const picker = `/exercises?pattern=${group.pattern}`;
  const label = patternLabel(group.pattern);

  return (
    <section>
      {/* items-center, not items-baseline: an SVG's baseline is its bottom edge, so a
          baseline row would float the pencil above the heading. */}
      <div className="flex items-center justify-between gap-4 px-2 pb-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{label}</h2>
        {group.rows.length > 0 && (
          // -m-3 p-3 keeps a thumb-sized tap area without making the control look big.
          <Link
            href={picker}
            aria-label={`Add ${label} exercises`}
            className="-m-3 touch-manipulation p-3 text-body active:text-ink"
          >
            <PlusIcon />
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-card bg-card">
        {group.rows.length === 0 ? (
          <>
            <p className="px-6 pt-5 text-body">No exercises yet.</p>
            <div className="p-3">
              <Link
                href={picker}
                className="flex h-12 touch-manipulation items-center justify-center rounded-pill bg-page text-base font-semibold text-ink active:bg-line"
              >
                Add exercises
              </Link>
            </div>
          </>
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

// Drawn inline rather than pulled from an icon set: it's the only icon in the app, and
// currentColor keeps it on the same token as the text beside it.
function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-6 w-6"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
