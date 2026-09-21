import Link from "next/link";
import type { BoardRow } from "@/lib/domain/board";
import { formatDaysAgo, formatSet } from "@/lib/format";

// One exercise: its name, the last working set (the value you'd repeat), and how long
// ago it was performed. Tapping opens its log sheet. Secondary text uses text-body rather
// than text-mute, which is too faint to read in a dim gym.
export function ExerciseRow({ row }: { row: BoardRow }) {
  const { exercise, lastSet, daysSince } = row;
  return (
    <li>
      <Link
        href={`/exercise?id=${encodeURIComponent(exercise.id)}`}
        className="flex min-h-16 touch-manipulation items-center justify-between gap-4 px-6 py-3 active:bg-page"
      >
        <span className="text-base font-semibold text-ink">{exercise.name}</span>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-semibold tabular-nums text-ink">
            {lastSet ? formatSet(lastSet) : "—"}
          </span>
          {daysSince !== null && (
            <span className="block text-sm text-body">{formatDaysAgo(daysSince)}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
