"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PATTERNS, type Exercise } from "@/lib/domain/types";
import { patternLabel } from "@/lib/format";
import { useCatalogue } from "@/lib/hooks/useCatalogue";
import { addToList, moveInList, removeFromList } from "@/lib/writes";
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
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-card">
            {yours.map((exercise, index) => (
              <OrderRow
                key={exercise.id}
                exercise={exercise}
                first={index === 0}
                last={index === yours.length - 1}
              />
            ))}
          </ul>
          <p className="px-2 pt-2 text-sm text-body">
            The board follows this order. Logging never changes it.
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

// One row of your order, with a step up and a step down. Both are full-height tap targets, and
// the one that would do nothing at the end of the list is disabled rather than silently inert.
function OrderRow({
  exercise,
  first,
  last,
}: {
  exercise: Exercise;
  first: boolean;
  last: boolean;
}) {
  const [failed, setFailed] = useState(false);

  async function move(direction: "up" | "down") {
    setFailed(false);
    try {
      await moveInList(exercise.id, direction);
    } catch {
      setFailed(true);
    }
  }

  return (
    <li className="flex min-h-16 items-center gap-2 py-2 pr-2 pl-6">
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink">{exercise.name}</span>
        {failed && (
          <span role="alert" className="block text-sm font-semibold text-negative-deep">
            Couldn&apos;t save that. Try again.
          </span>
        )}
      </span>
      <MoveButton label={`Move ${exercise.name} up`} disabled={first} onClick={() => void move("up")}>
        <ChevronIcon up />
      </MoveButton>
      <MoveButton
        label={`Move ${exercise.name} down`}
        disabled={last}
        onClick={() => void move("down")}
      >
        <ChevronIcon />
      </MoveButton>
    </li>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-pill ${
        disabled ? "text-line" : "text-ink active:bg-page"
      }`}
    >
      {children}
    </button>
  );
}

function ChevronIcon({ up = false }: { up?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}
