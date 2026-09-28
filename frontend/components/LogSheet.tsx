"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { prefillFor } from "@/lib/domain/entry";
import { previousSession } from "@/lib/domain/previous";
import { historyPRs } from "@/lib/domain/prs";
import { SESSION_GAP_MINUTES, deriveSessions } from "@/lib/domain/sessions";
import { countLabel, patternLabel, recordLine } from "@/lib/format";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useLogSheet } from "@/lib/hooks/useLogSheet";
import { useNextUp } from "@/lib/hooks/useNextUp";
import { useNow } from "@/lib/hooks/useNow";
import { replaceSheet } from "@/lib/sheets";
import { BackLink } from "./BackLink";
import { LevelBadge } from "./LevelBadge";
import { RecordBanner } from "./RecordBanner";
import { RestTimer } from "./RestTimer";
import { SetEntry } from "./SetEntry";
import { SetHistory } from "./SetHistory";
import { SetTable } from "./SetTable";

// The log sheet as a full page, chosen by `?id=` in the URL. It's kept for old links and for
// opening an exercise straight from a bookmark; from the app, the same content opens as a sheet
// over the page you're on (`?log=`, see SheetHost). A static page that reads the id in the
// browser, so it works with no signal.
export function LogSheet() {
  const id = useSearchParams().get("id");

  return (
    // Bottom padding keeps the last content clear of the pinned Log button.
    <div className="pb-56">
      <nav className="pb-4">
        <BackLink href="/" label="‹ Board" />
      </nav>
      <LogSheetBody exerciseId={id} />
    </div>
  );
}

// Everything about logging one exercise: its name and level, the rest timer, today's sets beside
// last time's, the entry form, and the earlier history folded away. Everything shown comes from
// the local database and is derived from set_logs. Inside a sheet, the Log button goes into the
// sheet's footer; on the full page it pins itself to the screen.
export function LogSheetBody({ exerciseId }: { exerciseId: string | null }) {
  const data = useLogSheet(exerciseId);
  const now = useNow();
  const active = useActiveSession();
  const [record, setRecord] = useState<{ id: string; line: string } | null>(null);
  // Stable, so the clock's repaints don't restart the banner's countdown.
  const hideRecord = useCallback(() => setRecord(null), []);

  // The session you're in splits today from last time. With none active, the next set opens a
  // new session, so today is empty and the latest session is last time.
  const sessionStart = active?.session?.started_at ?? null;
  const table = useMemo(() => {
    if (!data?.exercise) return null;
    const { history, endMarkers } = data;
    const start = sessionStart ?? Infinity;
    const today = history.filter((set) => set.logged_at >= start).reverse(); // oldest first
    const earlier = history.filter((set) => set.logged_at < start);
    return {
      today,
      earlier,
      earlierSessions: deriveSessions(earlier, SESSION_GAP_MINUTES, endMarkers).length,
      lastTime: previousSession(data.exercise.id, history, start, SESSION_GAP_MINUTES, endMarkers),
      records: historyPRs(history),
    };
  }, [data, sessionStart]);

  if (data === undefined) return null;
  if (data.exercise === null || table === null) {
    return (
      <p className="rounded-card bg-raised px-6 py-5 text-body">
        That exercise isn&apos;t on this device.
      </p>
    );
  }

  const setNumber = table.today.length + 1;
  const prefill = prefillFor(setNumber, table.lastTime, table.today, data.previous);
  const showTable = table.today.length > 0 || table.lastTime.length > 0;

  return (
    <div key={data.exercise.id} className="flex flex-col gap-4">
      {/* min-h holds the height of the timer column, so the form below doesn't jump when
          the first set of a session makes the timers appear. */}
      <header className="flex min-h-16 items-start justify-between gap-4 px-2">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-black leading-none tracking-tight break-words text-ink">
            {data.exercise.name}
          </h1>
          <p className="pt-2 text-body">
            {patternLabel(data.exercise.pattern)}
            {data.mastery.level > 0 && (
              <>
                {" · "}
                <LevelBadge mastery={data.mastery} />
              </>
            )}
          </p>
        </div>
        {/* Only the rest timer here: mid-set it's the one number that matters. */}
        <div className="flex shrink-0 flex-col items-end">
          <RestTimer />
        </div>
      </header>

      {/* Keyed by set, so back-to-back records each get their own entrance. */}
      {record && <RecordBanner key={record.id} line={record.line} onDone={hideRecord} />}

      {showTable && <SetTable today={table.today} lastTime={table.lastTime} records={table.records} />}

      <SetEntry
        exerciseId={data.exercise.id}
        setNumber={setNumber}
        prefill={prefill}
        history={data.history}
        onRecord={(set, prs) => setRecord({ id: set.id, line: recordLine(set, prs) })}
        below={table.today.length > 0 ? <NextUp exerciseId={data.exercise.id} /> : null}
      />

      {table.earlier.length > 0 && (
        <details className="group rounded-card border border-line">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 font-semibold text-body [&::-webkit-details-marker]:hidden">
            Earlier · {countLabel(table.earlierSessions, "session")}
            <span aria-hidden className="text-2xl leading-none text-mute transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <div className="px-2 pb-3">
            <SetHistory history={table.earlier} now={now} title={null} />
          </div>
        </details>
      )}
    </div>
  );
}

// "Next up: Overhead Press ›" under the Log button: the next lift on your board not done this
// session. Tapping swaps the sheet to it in place; back still returns to the page underneath.
function NextUp({ exerciseId }: { exerciseId: string }) {
  const next = useNextUp(exerciseId);
  if (!next) return null;
  return (
    <button
      type="button"
      onClick={() => replaceSheet("log", next.id)}
      className="mx-auto min-h-11 touch-manipulation px-4 font-semibold text-body active:text-ink"
    >
      Next up: {next.name} ›
    </button>
  );
}
