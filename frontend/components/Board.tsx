"use client";

import { useBoard } from "@/lib/hooks/useBoard";
import { PatternGroup } from "./PatternGroup";
import { SessionHeader } from "./SessionHeader";

// The client boundary between the server-rendered page and the local database. Until
// the first local read finishes (milliseconds) only the title shows — there is no
// spinner because nothing here waits on the network.
export function Board() {
  const groups = useBoard();

  return (
    <>
      <header className="flex items-baseline justify-between gap-4 pb-6">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          Overload
        </h1>
        <SessionHeader showLast />
      </header>
      {groups && (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <PatternGroup key={group.pattern} group={group} />
          ))}
        </div>
      )}
    </>
  );
}
