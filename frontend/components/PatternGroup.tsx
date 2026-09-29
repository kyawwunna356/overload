"use client";

import Link from "next/link";
import type { BoardGroup } from "@/lib/domain/board";
import { patternLabel } from "@/lib/format";
import { CheckBadge } from "./CheckBadge";
import { ExerciseRow } from "./ExerciseRow";

// A group shows the exercises you picked for that pattern, all of them, in the order you put
// them in — you chose them, so nothing is folded away. The board only renders groups you've picked
// for. The heading gets a ✓ once the session you're in has touched the pattern: information, never
// a target, so an untouched heading has no mark at all.
export function PatternGroup({ group, covered }: { group: BoardGroup; covered: boolean }) {
  const label = patternLabel(group.pattern);

  return (
    <section>
      {/* items-center, not items-baseline: an SVG's baseline is its bottom edge, so a
          baseline row would float the plus above the heading. */}
      <div className="flex items-center justify-between gap-4 px-2 pb-2">
        <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-ink">
          {label}
          {covered && (
            <>
              <CheckBadge size="sm" />
              <span className="sr-only">, covered this session</span>
            </>
          )}
        </h2>
        {/* -m-3 p-3 keeps a thumb-sized tap area without making the control look big. */}
        <Link
          href={`/exercises?pattern=${group.pattern}`}
          aria-label={`Add ${label} exercises`}
          className="-m-3 touch-manipulation p-3 text-body active:text-ink"
        >
          <PlusIcon />
        </Link>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-card bg-card">
        {group.rows.map((row) => (
          <ExerciseRow key={row.exercise.id} row={row} />
        ))}
      </ul>
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
