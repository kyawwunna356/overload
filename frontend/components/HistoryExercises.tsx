"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { exerciseIndex, type ExerciseIndexRow } from "@/lib/domain/exerciseHistory";
import { formatDaysAgo, formatSet } from "@/lib/format";
import { useExerciseIndex } from "@/lib/hooks/useExerciseIndex";
import { useNow } from "@/lib/hooks/useNow";
import { SearchIcon } from "./ExercisePicker";

// Every lift you've logged, A to Z, each with the last working set and how long ago — the board
// row's grey line — and a › to its page. A search box narrows it as you type. Lifts you've never
// done aren't here (the catalogue lives in edit board); one you've taken off the board still is.
export function HistoryExercises() {
  const data = useExerciseIndex();
  const now = useNow();
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () => (data === undefined ? undefined : exerciseIndex(data.exercises, data.latest, now, query)),
    [data, now, query],
  );

  if (rows === undefined) return null;
  const nothingYet = rows.length === 0 && query.trim() === "";
  if (nothingYet) {
    return (
      <p className="rounded-card bg-card px-6 py-5 text-body">
        Every lift you log will be listed here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative px-2">
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
      {rows.length === 0 ? (
        <p className="px-4 text-body">No lift called “{query.trim()}” yet.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card bg-card">
          {rows.map((row) => (
            <IndexRow key={row.exercise.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function IndexRow({ row }: { row: ExerciseIndexRow }) {
  const ago = formatDaysAgo(row.daysAgo);
  const parts = [row.set ? formatSet(row.set) : null, ago].filter((part) => part !== null);
  return (
    <li>
      <Link
        href={`/history/exercise?id=${encodeURIComponent(row.exercise.id)}`}
        className="flex min-h-16 touch-manipulation items-center gap-3 py-3 pr-4 pl-6 active:bg-page"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink">{row.exercise.name}</span>
          <span className="block text-[13px] tabular-nums text-body">
            <span className="sr-only">Last time: </span>
            {parts.join(" · ")}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-2xl leading-none text-mute">
          ›
        </span>
      </Link>
    </li>
  );
}
