import type { BoardRow, RowState } from "@/lib/domain/board";
import { countLabel, formatDaysAgo, formatSet, formatSetShort } from "@/lib/format";
import { CheckBadge } from "./CheckBadge";
import { LogLink } from "./LogLink";

// One exercise: its name, then one short line that answers the question you have at that moment.
// Before you've done it this session it's last time, in grey (`82.5 kg × 5 · 4d`); after, it's
// today, in lime with a tick badge (`3 sets · 102.5 × 5`, the heaviest set) — or a yellow PR pill in
// its place when one of today's sets broke a record. The colour tells them
// apart, so neither needs a label; a lift never done is just its name. The row never moves when
// that line changes. Tapping opens its log sheet over the board, which the chevron says.
export function ExerciseRow({ row }: { row: BoardRow }) {
  const { exercise, state } = row;
  return (
    <li>
      <LogLink
        exerciseId={exercise.id}
        className="flex min-h-16 touch-manipulation items-center gap-3 py-3 pr-4 pl-6 active:bg-page"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink">{exercise.name}</span>
          <StateLine state={state} />
        </span>
        {state.kind === "today" && (state.record ? <PRPill /> : <CheckBadge size="md" />)}
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
      <span className="block text-[13px] tabular-nums text-primary">
        <span className="sr-only">Today: </span>
        {countLabel(state.sets, "set")} · {formatSetShort(state.best)}
      </span>
    );
  }
  // A lift never done is just its name.
  if (state.kind === "new") return null;

  // The age is left off under a day: a lift done earlier today, in a session that's over, just
  // shows the set.
  const ago = formatDaysAgo(state.daysAgo);
  const parts = [state.set ? formatSet(state.set) : null, ago === "today" ? null : ago].filter(
    (part) => part !== null,
  );
  if (parts.length === 0) return null;
  return (
    <span className="block text-[13px] tabular-nums text-body">
      <span className="sr-only">Last time: </span>
      {parts.join(" · ")}
    </span>
  );
}

// The tick's place on a row that broke a record today: a yellow "PR" pill, the record colour.
function PRPill() {
  return (
    <span className="inline-flex h-7 shrink-0 items-center rounded-pill bg-record-pale px-3 text-xs font-bold tracking-wide text-record">
      <span aria-hidden>PR</span>
      <span className="sr-only">New record today</span>
    </span>
  );
}
