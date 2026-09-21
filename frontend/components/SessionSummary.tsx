"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { dayLabel } from "@/lib/domain/history";
import { formatDuration } from "@/lib/domain/timers";
import { countLabel, formatSet, formatTime, kindLabel, patternLabel } from "@/lib/format";
import { useNow } from "@/lib/hooks/useNow";
import { useSessionSummary } from "@/lib/hooks/useSessionSummary";
import { BackLink } from "./BackLink";

// What you did in one session, chosen by `?id=` in the URL (a session's id is its first set's
// id). A static page that reads the id in the browser, so it opens with no signal, and every
// number on it is derived from the sets in the local database. It's a read-only view: it never
// asks whether you finished anything, and deleting a set stays on the log sheet.
export function SessionSummary() {
  const id = useSearchParams().get("id");
  const data = useSessionSummary(id);
  const now = useNow();
  const summary = data?.summary ?? null;

  return (
    <div>
      <nav className="pb-4">
        <BackLink href="/" label="‹ Back" />
      </nav>

      {data === undefined ? null : summary === null ? (
        <p className="rounded-card bg-card px-6 py-5 text-body">
          That session isn&apos;t on this device.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <header className="px-2">
            <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
              {dayLabel(summary.session.started_at, now)}
            </h1>
            <p className="pt-2 text-body tabular-nums">
              {formatTime(summary.session.started_at)} – {formatTime(summary.session.last_set_at)}
            </p>
            <p className="pt-1 text-body">
              {[
                countLabel(summary.setCount, "set"),
                countLabel(summary.exerciseCount, "exercise"),
                // A one-set session has no span worth showing.
                ...(summary.durationMs > 0 ? [formatDuration(summary.durationMs)] : []),
              ].join(" · ")}
            </p>
          </header>

          {summary.groups.map((group) => (
            <section key={group.sets[0].exercise_id} className="overflow-hidden rounded-card bg-card">
              {group.exercise ? (
                <Link
                  href={`/exercise?id=${encodeURIComponent(group.exercise.id)}`}
                  className="block min-h-16 touch-manipulation px-6 py-3 active:bg-page"
                >
                  <h2 className="text-lg font-semibold text-ink">{group.exercise.name}</h2>
                  <p className="text-sm text-body">{patternLabel(group.exercise.pattern)}</p>
                </Link>
              ) : (
                <div className="min-h-16 px-6 py-3">
                  <h2 className="text-lg font-semibold text-ink">Unknown exercise</h2>
                </div>
              )}
              <ul className="divide-y divide-line border-t border-line">
                {group.sets.map((set) => (
                  <li key={set.id} className="flex min-h-14 items-center justify-between gap-4 px-6 py-2">
                    <p className="text-base font-semibold tabular-nums text-ink">{formatSet(set)}</p>
                    <p className="text-sm tabular-nums text-body">
                      {formatTime(set.logged_at)}
                      {set.kind !== "working" && ` · ${kindLabel(set.kind)}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
