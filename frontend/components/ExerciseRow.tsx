import Link from "next/link";
import type { BoardRow } from "@/lib/domain/board";
import { formatDaysAgo, formatSet } from "@/lib/format";

// One exercise: its name, the last working set (the value you'd repeat), and how long
// ago it was performed. Tapping opens its log sheet, which the chevron says.
//
// The name is the one white thing on a row. The last set and its age are quiet on purpose — the
// user found them clashing with the name in white — so they use text-mute, the faintest token,
// even though secondary text elsewhere stays on text-body for a dim gym.
export function ExerciseRow({ row }: { row: BoardRow }) {
  const { exercise, lastSet, daysSince } = row;
  // Only how long ago, never "today": mid-session, every row you've touched would say it.
  const ago = daysSince === null ? null : formatDaysAgo(daysSince);
  return (
    <li>
      <Link
        href={`/exercise?id=${encodeURIComponent(exercise.id)}`}
        className="flex min-h-16 touch-manipulation items-center gap-3 py-3 pr-4 pl-6 active:bg-page"
      >
        <span className="min-w-0 flex-1 text-base font-semibold text-ink">{exercise.name}</span>
        {/* A lift never done shows nothing here, just the name and the chevron. */}
        {lastSet && (
          <span className="shrink-0 text-right text-mute">
            <span className="block text-sm font-semibold tabular-nums">{formatSet(lastSet)}</span>
            {ago !== null && ago !== "today" && <span className="block text-xs">{ago}</span>}
          </span>
        )}
        <span aria-hidden className="shrink-0 text-2xl leading-none text-mute">
          ›
        </span>
      </Link>
    </li>
  );
}
