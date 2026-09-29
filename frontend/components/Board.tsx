"use client";

import Link from "next/link";
import { formatDay } from "@/lib/format";
import { useBoard } from "@/lib/hooks/useBoard";
import { useCoverage } from "@/lib/hooks/useCoverage";
import { useNow } from "@/lib/hooks/useNow";
import { PatternGroup } from "./PatternGroup";
import { WeekStrip } from "./WeekStrip";

// The Train tab: today's date, this week, and your list — the exercises you picked, grouped by
// pattern, in your order. A pattern you haven't picked for isn't shown; with nothing picked at all,
// one card offers to pick. Until the first local read finishes (milliseconds) only the header
// shows — there is no spinner because nothing here waits on the network.
export function Board() {
  const now = useNow();
  const groups = useBoard();
  const covered = useCoverage();
  const picked = groups?.filter((group) => group.rows.length > 0);

  return (
    <>
      <header className="flex items-center justify-between gap-4 pb-5">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          {formatDay(now)}
        </h1>
        <Link
          href="/exercises"
          // -m-3 p-3 keeps a thumb-sized tap area around a small label, like + New on Edit board.
          className="-m-3 touch-manipulation p-3 text-lg font-semibold text-primary active:text-primary-active"
        >
          Edit
        </Link>
      </header>
      <div className="pb-6">
        <WeekStrip anchor={now} />
      </div>
      {picked && picked.length === 0 && <EmptyBoard />}
      {picked && picked.length > 0 && (
        <div className="flex flex-col gap-6">
          {picked.map((group) => (
            <PatternGroup key={group.pattern} group={group} covered={covered?.[group.pattern] ?? false} />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyBoard() {
  return (
    <section className="rounded-card bg-card px-6 pt-5 pb-3">
      <h2 className="text-xl font-semibold tracking-tight text-ink">Pick your exercises</h2>
      <p className="pt-1 text-body">Choose the lifts you do, and they&apos;ll wait here in your order.</p>
      <Link
        href="/exercises"
        className="mt-4 flex h-12 touch-manipulation items-center justify-center rounded-pill bg-primary text-base font-semibold text-on-primary active:bg-primary-active"
      >
        Pick exercises
      </Link>
    </section>
  );
}
