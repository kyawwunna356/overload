"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { customName } from "@/lib/domain/custom";
import { dropIndex, pickCounts, splitPicks } from "@/lib/domain/list";
import { PATTERNS, type Exercise, type Pattern } from "@/lib/domain/types";
import { patternLabel } from "@/lib/format";
import { useCatalogue } from "@/lib/hooks/useCatalogue";
import { FLIP_MS, useFlip } from "@/lib/hooks/useFlip";
import { addCustomExercise, addToList, moveInList, removeFromList, setListOrder } from "@/lib/writes";

// The catalogue: every exercise the app knows, with the ones on your list first, in your order,
// ready to drag. Tapping a row adds it to the board or takes it off — one tap, no save button and
// no confirmation, because nothing here can be lost (Hard Rule 3: this decides what the board
// shows, never what you can log, and removing an exercise keeps every set you ever did of it).
// Every change saves as you make it, so there's no Done: you leave the way you came, by swiping
// back. The one button up top adds an exercise of your own.
//
// A page of its own, reached from the board's Edit (every pattern) or a group's + (that pattern's
// chip). A static page that reads `?pattern=` in the browser, so it opens with no signal.
export function ExercisePicker() {
  // Which chip is selected: one pattern, or "all". It lives in the URL, replaced rather than pushed,
  // so a reload keeps it and back still returns straight to the board.
  const requested = useSearchParams().get("pattern");
  const view: Pattern | "all" = PATTERNS.find((pattern) => pattern === requested) ?? "all";
  const choose = (next: Pattern | "all") =>
    window.history.replaceState(null, "", next === "all" ? "/exercises" : `/exercises?pattern=${next}`);

  const catalogue = useCatalogue();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const counts = pickCounts(catalogue?.yours ?? []);
  const total = PATTERNS.reduce((sum, pattern) => sum + counts[pattern], 0);

  const needle = query.trim().toLowerCase();
  const groups = (catalogue?.groups ?? [])
    .filter((group) => view === "all" || group.pattern === view)
    .map((group) => ({
      ...group,
      exercises: group.exercises.filter((exercise) =>
        exercise.name.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.exercises.length > 0);

  return (
    <div className="pb-8">
      <header className="flex items-center justify-between gap-4 px-2 pb-5">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">Edit board</h1>
        {/* -m-3 p-3 keeps a thumb-sized tap area around a small label. */}
        <button
          type="button"
          aria-expanded={creating}
          aria-label="Add a custom exercise"
          onClick={() => setCreating((open) => !open)}
          className="-m-3 touch-manipulation p-3 text-lg font-semibold text-primary active:text-primary-active"
        >
          + New
        </button>
      </header>

      {creating && catalogue && (
        <NewExercise
          catalogue={catalogue.groups.flatMap((group) => group.exercises)}
          listed={catalogue.listed}
          pattern={view === "all" ? null : view}
          onClose={() => setCreating(false)}
          onAdded={(pattern) => {
            setCreating(false);
            setQuery("");
            choose(pattern);
          }}
        />
      )}

      <div className="relative px-2 pb-4">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className="h-12 w-full rounded-control bg-card pr-4 pl-12 text-base text-ink placeholder:text-body"
        />
      </div>

      {/* One row that scrolls sideways, running to the screen's edges; the scrollbar is hidden
          app-wide. */}
      <div role="radiogroup" aria-label="Pattern" className="-mx-4 flex gap-2 overflow-x-auto px-6 pb-5">
        <Chip label="All" count={total} selected={view === "all"} onSelect={() => choose("all")} />
        {PATTERNS.map((pattern) => (
          <Chip
            key={pattern}
            label={patternLabel(pattern)}
            count={counts[pattern]}
            selected={view === pattern}
            onSelect={() => choose(pattern)}
          />
        ))}
      </div>

      {catalogue === undefined ? null : groups.length === 0 ? (
        <p className="rounded-card bg-card px-6 py-5 text-body">
          Nothing matches “{query.trim()}”.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.pattern}>
              {/* With one pattern chosen, its chip already names it. */}
              {view === "all" && (
                <h2 className="px-2 pb-2 text-xl font-semibold tracking-tight text-ink">
                  {patternLabel(group.pattern)}
                </h2>
              )}
              <PatternList
                catalogue={group.exercises}
                yours={catalogue.yours.filter((exercise) => exercise.pattern === group.pattern)}
                searching={needle !== ""}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// A pattern chip: its name, how many you've picked there (a count of your own choices, never a
// target to reach), and a tick when it's the one selected.
function Chip({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`inline-flex h-9 shrink-0 touch-manipulation items-center gap-1 rounded-pill px-3.5 text-sm font-semibold whitespace-nowrap ${
        selected ? "bg-primary-pale text-ink-deep" : "bg-card text-body active:bg-line"
      }`}
    >
      {label}
      {count > 0 && <span className="tabular-nums">{count}</span>}
      {selected && <span aria-hidden>✓</span>}
    </button>
  );
}

// Your own exercise: a name and its pattern (preset to the chip you're on). It joins the catalogue
// and your board at once. A name the catalogue already has isn't made twice; the form offers that
// exercise instead, so your history stays under one name.
function NewExercise({
  catalogue,
  listed,
  pattern: preset,
  onClose,
  onAdded,
}: {
  catalogue: Exercise[];
  // Ids already on your board.
  listed: ReadonlySet<string>;
  pattern: Pattern | null;
  onClose: () => void;
  onAdded: (pattern: Pattern) => void;
}) {
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState<Pattern | null>(preset);
  const [failed, setFailed] = useState(false);
  const checked = customName(name, catalogue);
  const taken = checked.kind === "taken" ? checked.exercise : null;
  const onBoard = taken !== null && listed.has(taken.id);

  async function submit() {
    setFailed(false);
    try {
      if (taken) {
        await addToList(taken.id, taken.pattern);
        onAdded(taken.pattern);
      } else if (checked.kind === "ok" && pattern) {
        await addCustomExercise(checked.name, pattern);
        onAdded(pattern);
      }
    } catch {
      setFailed(true);
    }
  }

  const ready = (taken !== null && !onBoard) || (checked.kind === "ok" && pattern !== null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) void submit();
      }}
      className="mb-5 rounded-card bg-card px-5 pt-5 pb-4"
    >
      <h2 className="text-lg font-semibold text-ink">New exercise</h2>
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Name, e.g. Landmine Press"
        aria-label="Exercise name"
        autoCapitalize="words"
        enterKeyHint="done"
        className="mt-3 h-12 w-full rounded-control bg-raised px-4 text-base text-ink placeholder:text-body"
      />
      {taken ? (
        <p className="pt-2 text-sm text-body">
          {taken.name} is already {onBoard ? "on your board" : `in ${patternLabel(taken.pattern)}`}.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Pattern" className="flex flex-wrap gap-2 pt-3">
          {PATTERNS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={pattern === option}
              onClick={() => setPattern(option)}
              className={`inline-flex h-9 touch-manipulation items-center rounded-pill px-3.5 text-sm font-semibold ${
                pattern === option ? "bg-primary-pale text-ink-deep" : "bg-raised text-body active:bg-line"
              }`}
            >
              {patternLabel(option)}
            </button>
          ))}
        </div>
      )}
      {failed && (
        <p role="alert" className="pt-2 text-sm font-semibold text-negative-deep">
          Couldn&apos;t save that. Try again.
        </p>
      )}
      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 touch-manipulation rounded-pill bg-raised text-base font-semibold text-ink active:bg-line"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!ready}
          className="h-12 flex-1 touch-manipulation rounded-pill bg-primary text-base font-semibold text-on-primary active:bg-primary-active disabled:bg-raised disabled:text-mute"
        >
          {taken && !onBoard ? "Add it to the board" : "Add"}
        </button>
      </div>
    </form>
  );
}

// One pattern's list: your picks first, in your order, then the rest of the catalogue. Tapping a
// row adds it or takes it off; an added row slides up to the end of your picks (where the board
// puts it) and a removed one slides back to its catalogue place. Your picks carry a handle for
// dragging them into order — the fiddly arithmetic is `dropIndex` in the domain; this measures
// the rows and moves them.
//
// Only a handle starts a drag (`touch-action: none` on it alone), so a finger anywhere else scrolls
// the page. Nothing is written until you let go, so one gesture is one write. While rows are
// moving, taps are ignored for a moment: the row that slides under your thumb can't be toggled by
// accident.
function PatternList({
  catalogue,
  yours,
  searching,
}: {
  // This pattern's catalogue, already filtered by any search.
  catalogue: Exercise[];
  // Your picks in this pattern, in your order.
  yours: Exercise[];
  searching: boolean;
}) {
  const [drag, setDrag] = useState<{ id: string; from: number; dy: number; heights: number[] } | null>(
    null,
  );
  const [failed, setFailed] = useState<string | null>(null);
  // The order you just dropped, shown until the database read catches up. Without it the list snaps
  // back to the old order for a frame on release, and the row you dropped jumps twice. `basedOn` is
  // the order the read was still showing at that moment, so the override expires by itself the
  // instant the read changes — whether that's this write landing or anything else moving a row.
  const [dropped, setDropped] = useState<{ order: string[]; basedOn: string } | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const startY = useRef(0);
  const quietUntil = useRef(0);

  const { onBoard, rest } = splitPicks(catalogue, yours);
  const liveOrder = onBoard.map((exercise) => exercise.id).join();
  // Rows slide only when your picks change membership, never on a reorder.
  const flip = useFlip(onBoard.map((exercise) => exercise.id).sort().join());

  const ordered = inDroppedOrder(onBoard, dropped, liveOrder);

  const ids = ordered.map((exercise) => exercise.id);
  const to = drag ? dropIndex(drag.heights, drag.from, drag.dy) : -1;

  // `at` is the tap's event time, so the guard compares taps with each other, not with a clock.
  async function toggle(exercise: Exercise, listed: boolean, at: number) {
    if (drag !== null || at < quietUntil.current) return;
    quietUntil.current = at + FLIP_MS + 150;
    setFailed(null);
    try {
      if (listed) {
        await removeFromList(exercise.id);
      } else {
        await addToList(exercise.id, exercise.pattern);
        setJustAdded(exercise.id);
        setTimeout(() => setJustAdded((id) => (id === exercise.id ? null : id)), FLIP_MS + 350);
      }
    } catch {
      setFailed(exercise.id);
    }
  }

  function begin(event: React.PointerEvent, id: string, from: number) {
    const heights = ids.map((rowId) => rows.current.get(rowId)?.getBoundingClientRect().height ?? 0);
    startY.current = event.clientY;
    setFailed(null);
    setDrag({ id, from, dy: 0, heights });
    // Capture keeps the moves coming to this handle even when the finger wanders off it. A
    // synthetic pointer has nothing to capture, so it can throw; the drag then still works as long
    // as the finger stays over the handle, which is enough for the tests that do that.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* nothing to capture */
    }
  }

  // `id` is the row whose handle was let go: with two fingers down, only the one being dragged
  // may finish the drag, or lifting the other finger would drop it wherever it happened to be.
  async function end(id: string) {
    if (drag === null || drag.id !== id) return;
    const target = dropIndex(drag.heights, drag.from, drag.dy);
    setDrag(null);
    if (target === drag.from) return; // back where it started: nothing to store

    const moved = [...ids];
    moved.splice(target, 0, ...moved.splice(drag.from, 1));
    setDropped({ order: moved, basedOn: liveOrder });
    try {
      await setListOrder(moved);
    } catch {
      setFailed(id);
      setDropped(null); // nothing was stored, so show what really is stored
    }
  }

  // Where a pick sits while another is being dragged over it: the ones it has passed step aside by
  // exactly the dragged row's height, so the gap is always where the row will land.
  function shift(index: number): number {
    if (!drag || index === drag.from) return 0;
    const height = drag.heights[drag.from];
    if (drag.from < to && index > drag.from && index <= to) return -height;
    if (to < drag.from && index >= to && index < drag.from) return height;
    return 0;
  }

  function rowRef(id: string) {
    const setFlip = flip(id);
    return (el: HTMLLIElement | null) => {
      setFlip(el);
      if (el) rows.current.set(id, el);
      else rows.current.delete(id);
    };
  }

  function toggleButton(exercise: Exercise, listed: boolean) {
    return (
      <button
        type="button"
        aria-pressed={listed}
        onClick={(event) => void toggle(exercise, listed, event.timeStamp)}
        className={`flex min-h-16 min-w-0 flex-1 touch-manipulation items-center justify-between gap-4 py-3 pl-6 text-left active:bg-page ${
          listed && !searching ? "pr-1" : "pr-6"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink">{exercise.name}</span>
          {failed === exercise.id && (
            <span role="alert" className="block text-sm font-semibold text-negative-deep">
              Couldn&apos;t save that. Try again.
            </span>
          )}
        </span>
        <span
          aria-hidden
          className={`inline-flex h-7 shrink-0 items-center rounded-pill px-3 text-[13px] font-semibold ${
            listed ? "bg-primary-pale text-ink-deep" : "bg-page text-body"
          }`}
        >
          {listed ? "On board ✓" : "Add"}
        </span>
      </button>
    );
  }

  return (
    // select-none always: a finger resting on a row should never start selecting its text.
    <ul className="divide-y divide-line select-none overflow-hidden rounded-card bg-card">
      {ordered.map((exercise, index) => {
        const dragging = drag?.id === exercise.id;
        return (
          <li key={exercise.id} ref={rowRef(exercise.id)}>
            <div
              style={{ transform: `translateY(${dragging ? drag.dy : shift(index)}px)` }}
              className={`relative flex items-center pr-2 ${
                dragging
                  ? "z-10 bg-line shadow-2xl"
                  : drag
                    ? "transition-transform duration-150"
                    : // A new pick glows briefly across the whole row, so your eye can follow it up.
                      `transition-colors duration-700 ${justAdded === exercise.id ? "bg-primary-pale/60" : ""}`
              }`}
            >
              {toggleButton(exercise, true)}
              {!searching && (
                <button
                  type="button"
                  aria-label={`Reorder ${exercise.name}`}
                  style={{ touchAction: "none" }}
                  onPointerDown={(event) => begin(event, exercise.id, index)}
                  onPointerMove={(event) =>
                    setDrag((current) =>
                      current && current.id === exercise.id
                        ? { ...current, dy: event.clientY - startY.current }
                        : current,
                    )
                  }
                  onPointerUp={() => void end(exercise.id)}
                  onPointerCancel={() => void end(exercise.id)}
                  // Without a pointer: the arrow keys do the same one step at a time.
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                    event.preventDefault();
                    void moveInList(exercise.id, event.key === "ArrowUp" ? "up" : "down");
                  }}
                  className="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-pill text-body active:bg-line"
                >
                  <GripIcon />
                </button>
              )}
            </div>
          </li>
        );
      })}
      {rest.map((exercise) => (
        <li key={exercise.id} ref={rowRef(exercise.id)} className="flex">
          {toggleButton(exercise, false)}
        </li>
      ))}
    </ul>
  );
}

// Your picks as last dropped, until the read catches up (see `dropped` in PatternList).
function inDroppedOrder(
  onBoard: Exercise[],
  dropped: { order: string[]; basedOn: string } | null,
  liveOrder: string,
): Exercise[] {
  if (dropped === null || dropped.basedOn !== liveOrder) return onBoard;
  const byId = new Map(onBoard.map((exercise) => [exercise.id, exercise]));
  const rearranged = dropped.order.flatMap((id) => {
    const exercise = byId.get(id);
    return exercise ? [exercise] : [];
  });
  return rearranged.length === onBoard.length ? rearranged : onBoard;
}

function GripIcon() {
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
      <path d="M4 9h16M4 15h16" />
    </svg>
  );
}

// The magnifier inside the search box; drawn inline like the app's other icons.
export function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="pointer-events-none absolute top-3 left-6 h-6 w-6 text-body"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  );
}
