"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PATTERNS, type Exercise } from "@/lib/domain/types";
import { patternLabel } from "@/lib/format";
import { useCatalogue } from "@/lib/hooks/useCatalogue";
import { addToList, removeFromList } from "@/lib/writes";
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
          {only ? `Add ${patternLabel(only)}` : "Exercises"}
        </h1>
        <p className="pt-2 text-body">
          Tap to put one on your board, or take it off. Your sets are always kept.
        </p>
      </header>

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
