"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { dropIndex } from "@/lib/domain/list";
import { PATTERNS, type Exercise } from "@/lib/domain/types";
import { patternLabel } from "@/lib/format";
import { useCatalogue } from "@/lib/hooks/useCatalogue";
import { addToList, moveInList, removeFromList, setListOrder } from "@/lib/writes";
import { BackLink } from "./BackLink";

// The catalogue: every exercise the app knows, and which ones are on your list. Tapping a row
// adds it to the board or takes it off — one tap, no save button and no confirmation, because
// nothing here can be lost (Hard Rule 3: this decides what the board shows, never what you can
// log, and removing an exercise keeps every set you ever did of it).
//
// A static page that reads `?pattern=` in the browser, so it opens with no signal. With a
// pattern it shows just that group, which is what the board's Add link uses.
export function ExercisePicker() {
  const requested = useSearchParams().get("pattern");
  const catalogue = useCatalogue();
  const [query, setQuery] = useState("");
  // Widening to every pattern is a change of view, not a navigation: going anywhere and coming
  // back would leave "‹ Board" pointing at this page instead of the board.
  const [showAll, setShowAll] = useState(false);
  const only = showAll ? null : (PATTERNS.find((pattern) => pattern === requested) ?? null);

  // Only the group being shown can be ordered: an order is per pattern.
  const yours = (catalogue?.yours ?? []).filter((exercise) => exercise.pattern === only);

  const needle = query.trim().toLowerCase();
  const groups = (catalogue?.groups ?? [])
    .filter((group) => only === null || group.pattern === only)
    .map((group) => ({
      ...group,
      exercises: group.exercises.filter((exercise) =>
        exercise.name.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.exercises.length > 0);

  return (
    <div className="pb-8">
      <nav className="pb-4">
        <BackLink href="/" label="‹ Board" />
      </nav>

      <header className="px-2 pb-5">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          {only ? patternLabel(only) : "Exercises"}
        </h1>
        <p className="pt-2 text-body">
          Tap to put one on your board, or take it off. Your sets are always kept.
        </p>
      </header>

      {only && yours.length > 1 && (
        <section className="pb-6">
          <h2 className="px-2 pb-2 text-xl font-semibold tracking-tight text-ink">Your order</h2>
          <OrderList exercises={yours} />
          <p className="px-2 pt-2 text-sm text-body">
            Drag a row by its handle. The board follows this order, and logging never changes it.
          </p>
        </section>
      )}

      <div className="px-2 pb-5">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className="h-12 w-full rounded-control bg-card px-4 text-base text-ink placeholder:text-body"
        />
      </div>

      {catalogue === undefined ? null : groups.length === 0 ? (
        <p className="rounded-card bg-card px-6 py-5 text-body">
          Nothing matches “{query.trim()}”.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.pattern}>
              <h2 className="px-2 pb-2 text-xl font-semibold tracking-tight text-ink">
                {patternLabel(group.pattern)}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-card bg-card">
                {group.exercises.map((exercise) => (
                  <CatalogueRow
                    key={exercise.id}
                    exercise={exercise}
                    listed={catalogue.listed.has(exercise.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {only && (
        <div className="px-2 pt-6">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="h-12 w-full touch-manipulation rounded-pill bg-card text-base font-semibold text-ink active:bg-line"
          >
            Show every pattern
          </button>
        </div>
      )}
    </div>
  );
}

// One catalogue row. The whole row is the control, so it's easy to hit one-handed, and it says
// what it is now rather than what tapping will do — the tick is the state, not a promise.
function CatalogueRow({ exercise, listed }: { exercise: Exercise; listed: boolean }) {
  const [failed, setFailed] = useState(false);

  async function toggle() {
    setFailed(false);
    try {
      if (listed) await removeFromList(exercise.id);
      else await addToList(exercise.id, exercise.pattern);
    } catch {
      setFailed(true);
    }
  }

  return (
    <li>
      <button
        type="button"
        aria-pressed={listed}
        onClick={() => void toggle()}
        className="flex min-h-16 w-full touch-manipulation items-center justify-between gap-4 px-6 py-3 text-left active:bg-page"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink">{exercise.name}</span>
          {failed && (
            <span role="alert" className="block text-sm font-semibold text-negative-deep">
              Couldn&apos;t save that. Try again.
            </span>
          )}
        </span>
        <span
          aria-hidden
          className={`inline-flex h-9 shrink-0 items-center rounded-pill px-4 text-sm font-semibold ${
            listed ? "bg-primary-pale text-ink-deep" : "bg-page text-body"
          }`}
        >
          {listed ? "On board ✓" : "Add"}
        </span>
      </button>
    </li>
  );
}

// Your order, dragged into shape. The fiddly arithmetic — which row a drag has landed on — is
// `dropIndex` in the domain; this measures the rows and moves them.
//
// Only the handle starts a drag (`touch-action: none` on it alone), so a finger anywhere else on
// the list scrolls the page as it always did. Nothing is written until you let go, so one gesture
// is one write, and a drag you abandon costs nothing.
function OrderList({ exercises }: { exercises: Exercise[] }) {
  const [drag, setDrag] = useState<{ id: string; from: number; dy: number; heights: number[] } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  // The order you just dropped, shown until the database read catches up. Without it the list snaps
  // back to the old order for a frame on release, and the row you dropped jumps twice. `basedOn` is
  // the order the read was still showing at that moment, so the override expires by itself the
  // instant the read changes — whether that's this write landing or anything else moving a row.
  const [dropped, setDropped] = useState<{ order: string[]; basedOn: string } | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const startY = useRef(0);

  const liveOrder = exercises.map((exercise) => exercise.id).join();
  const ordered = useMemo(() => {
    if (dropped === null || dropped.basedOn !== liveOrder) return exercises;
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    const rearranged = dropped.order.flatMap((id) => {
      const exercise = byId.get(id);
      return exercise ? [exercise] : [];
    });
    return rearranged.length === exercises.length ? rearranged : exercises;
  }, [dropped, liveOrder, exercises]);

  const ids = ordered.map((exercise) => exercise.id);
  const to = drag ? dropIndex(drag.heights, drag.from, drag.dy) : -1;

  function begin(event: React.PointerEvent, id: string, from: number) {
    const heights = ids.map((rowId) => rows.current.get(rowId)?.getBoundingClientRect().height ?? 0);
    startY.current = event.clientY;
    setFailed(false);
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
      setFailed(true);
      setDropped(null); // nothing was stored, so show what really is stored
    }
  }

  // Where a row sits while another is being dragged over it: the ones it has passed step aside by
  // exactly the dragged row's height, so the gap is always where the row will land.
  function shift(index: number): number {
    if (!drag || index === drag.from) return 0;
    const height = drag.heights[drag.from];
    if (drag.from < to && index > drag.from && index <= to) return -height;
    if (to < drag.from && index >= to && index < drag.from) return height;
    return 0;
  }

  return (
    <>
      {failed && (
        <p role="alert" className="px-2 pb-2 text-sm font-semibold text-negative-deep">
          Couldn&apos;t save that order. Try again.
        </p>
      )}
      <ul
        // select-none always: a finger resting on a row should never start selecting its text.
        className="divide-y divide-line select-none overflow-hidden rounded-card bg-card"
      >
        {ordered.map((exercise, index) => {
          const dragging = drag?.id === exercise.id;
          return (
            <li
              key={exercise.id}
              ref={(el) => {
                if (el) rows.current.set(exercise.id, el);
                else rows.current.delete(exercise.id);
              }}
              style={{ transform: `translateY(${dragging ? drag.dy : shift(index)}px)` }}
              className={`relative flex min-h-16 items-center gap-2 py-2 pr-2 pl-6 ${
                dragging
                  ? "z-10 bg-line shadow-2xl"
                  : drag
                    ? "transition-transform duration-150"
                    : ""
              }`}
            >
              <span className="min-w-0 flex-1 text-base font-semibold text-ink">{exercise.name}</span>
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
            </li>
          );
        })}
      </ul>
    </>
  );
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
