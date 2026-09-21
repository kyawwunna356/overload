"use client";

import { useSearchParams } from "next/navigation";
import { patternLabel } from "@/lib/format";
import { useLogSheet } from "@/lib/hooks/useLogSheet";
import { useNow } from "@/lib/hooks/useNow";
import { BackLink } from "./BackLink";
import { RestTimer } from "./RestTimer";
import { SessionHeader } from "./SessionHeader";
import { SetEntry } from "./SetEntry";
import { SetHistory } from "./SetHistory";

// The log sheet for one exercise, chosen by `?id=` in the URL. It's a static page that reads
// the id in the browser, so opening it from the board never waits on a server — it works
// with no signal. Everything shown comes from the local database.
export function LogSheet() {
  const id = useSearchParams().get("id");
  const data = useLogSheet(id);
  const now = useNow();

  return (
    // Bottom padding keeps the last content clear of the pinned Log button.
    <div className="pb-56">
      <nav className="pb-4">
        <BackLink href="/" label="‹ Board" />
      </nav>

      {data === undefined ? null : data.exercise === null ? (
        <p className="rounded-card bg-card px-6 py-5 text-body">
          That exercise isn&apos;t on this device.
        </p>
      ) : (
        <div key={data.exercise.id} className="flex flex-col gap-6">
          {/* min-h holds the height of the timer column, so the form below doesn't jump when
              the first set of a session makes the timers appear. */}
          <header className="flex min-h-20 items-start justify-between gap-4 px-2">
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-black leading-none tracking-tight break-words text-ink">
                {data.exercise.name}
              </h1>
              <p className="pt-2 text-body">{patternLabel(data.exercise.pattern)}</p>
            </div>
            {/* The rest timer is the prominent counter; the session timer is the quiet one. */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <RestTimer />
              <SessionHeader />
            </div>
          </header>
          <SetEntry exerciseId={data.exercise.id} previous={data.previous} now={now} />
          <SetHistory history={data.history} now={now} />
        </div>
      )}
    </div>
  );
}
