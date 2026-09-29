import type { BoardRow, RowState } from "@/lib/domain/board";
import { countLabel, formatDaysAgo, formatSet } from "@/lib/format";
import { LogLink } from "./LogLink";

// One exercise: its name and level, then one line that answers the question you have at that
// moment — before you've done it this session, what you did last time; after, what you've done
// today. The row never moves when that line changes. Tapping opens its log sheet over the board,
// which the chevron says.
export function ExerciseRow({ row }: { row: BoardRow }) {
  const { exercise, state, level } = row;
  return (
    <li>
      <LogLink
        exerciseId={exercise.id}
        className="flex min-h-16 touch-manipulation items-center gap-3 py-3 pr-4 pl-6 active:bg-page"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink">
            {exercise.name}
            {level > 0 && <span className="font-normal text-body"> · Level {level}</span>}
          </span>
          <StateLine state={state} />
        </span>
        <span aria-hidden className="shrink-0 text-2xl leading-none text-mute">
          ›
        </span>
      </LogLink>
    </li>
  );
}

function StateLine({ state }: { state: RowState }) {
  if (state.kind === "today") {
    return (
      <span className="block text-sm tabular-nums text-body">
        <span aria-hidden className="font-bold text-primary">
          ✓{" "}
        </span>
        Today: {countLabel(state.sets, "set")} · best {formatSet(state.best)}
      </span>
    );
  }
  if (state.kind === "new") return <span className="block text-sm text-body">New</span>;

  // The age is left off under a day: a lift done earlier today, in a session that's over, just
  // shows the set.
  const ago = formatDaysAgo(state.daysAgo);
  const parts = [state.set ? formatSet(state.set) : null, ago === "today" ? null : ago].filter(
    (part) => part !== null,
  );
  return (
    <span className="block text-sm tabular-nums text-body">
      Last: {parts.length > 0 ? parts.join(" · ") : "today"}
    </span>
  );
}
