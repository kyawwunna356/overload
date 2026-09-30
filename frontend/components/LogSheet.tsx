"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { prefillFor, type Entry } from "@/lib/domain/entry";
import { previousSession } from "@/lib/domain/previous";
import { historyPRs, type PR } from "@/lib/domain/prs";
import { SESSION_GAP_MINUTES, deriveSessions } from "@/lib/domain/sessions";
import { countLabel } from "@/lib/format";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useLogSheet } from "@/lib/hooks/useLogSheet";
import { useNow } from "@/lib/hooks/useNow";
import type { SetLog } from "@/lib/domain/types";
import { deleteSet, restoreSet } from "@/lib/writes";
import { BackLink } from "./BackLink";
import { LevelBadge } from "./LevelBadge";
import { RecordBanner } from "./RecordBanner";
import { RestTimer } from "./RestTimer";
import { SetEdit, SetEntry } from "./SetEntry";
import { SetHistory } from "./SetHistory";
import { SetTable } from "./SetTable";
import { Snackbar } from "./Snackbar";

// The log sheet as a full page, chosen by `?id=` in the URL. It's kept for old links and for
// opening an exercise straight from a bookmark; from the app, the same content opens as a sheet
// over the page you're on (`?log=`, see SheetHost). A static page that reads the id in the
// browser, so it works with no signal.
export function LogSheet() {
  const id = useSearchParams().get("id");

  return (
    // Bottom padding keeps the last content clear of the pinned entry and Log button.
    <div className="pb-[22rem]">
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
  const [record, setRecord] = useState<{ set: SetLog; prs: PR[] } | null>(null);
  // Stable, so the clock's repaints don't restart the banner's countdown.
  const hideRecord = useCallback(() => setRecord(null), []);
  // The today set open in the editor, and the last set deleted (for Undo). Throwaway UI state; the
  // deleted set is only held here until the snackbar goes.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<SetLog | null>(null);
  // Your change to the next set's numbers (null = follow the prefill). Kept until the sheet closes.
  const [entryEdit, setEntryEdit] = useState<Entry | null>(null);
  const hideDeleted = useCallback(() => setDeleted(null), []);
  const remove = useCallback(async (set: SetLog) => {
    await deleteSet(set.id);
    setDeleted(set);
    setEditingId((id) => (id === set.id ? null : id));
  }, []);

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
      <p className="rounded-card bg-card px-6 py-5 text-body">
        That exercise isn&apos;t on this device.
      </p>
    );
  }

  const setNumber = table.today.length + 1;
  // The set being edited, looked up afresh so a delete (here or on another tab) closes the editor.
  const editingIndex = editingId === null ? -1 : table.today.findIndex((set) => set.id === editingId);
  const editing = editingIndex >= 0 ? table.today[editingIndex] : null;
  const undo = deleted && (
    <Snackbar
      key={deleted.id}
      message="Set deleted"
      action="Undo"
      onAction={() => {
        void restoreSet(deleted);
        setDeleted(null);
      }}
      onDone={hideDeleted}
    />
  );
  const prefill = prefillFor(setNumber, table.lastTime, table.today, data.previous);

  return (
    <div key={data.exercise.id} className="flex flex-col gap-4">
      {/* min-h holds the height of the timer column, so the form below doesn't jump when
          the first set of a session makes the timers appear. */}
      <header className="flex min-h-16 items-start justify-between gap-4 px-2">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-black leading-none tracking-tight break-words text-ink">
            {data.exercise.name}
          </h1>
          {/* The level only, even Level 0 on a first time; the pattern is already on the board. */}
          <p className="pt-2 text-body">
            <LevelBadge mastery={data.mastery} />
          </p>
        </div>
        {/* Only the rest timer here: mid-set it's the one number that matters. */}
        <div className="flex shrink-0 flex-col items-end">
          <RestTimer />
        </div>
      </header>

      {/* Keyed by set, so back-to-back records each get their own entrance. */}
      {record && <RecordBanner key={record.set.id} set={record.set} prs={record.prs} onDone={hideRecord} />}

      {/* Always shown, even before the first set ever: set 1 waits as Next set, so the sheet is
          never blank and nothing jumps when the first set lands. */}
      <SetTable
        today={table.today}
        lastTime={table.lastTime}
        records={table.records}
        next={entryEdit ?? prefill.entry}
        editingId={editing?.id ?? null}
        onEdit={(set) => setEditingId((id) => (id === set.id ? null : set.id))}
        onDelete={remove}
      />

      {editing && (
        <SetEdit
          key={editing.id}
          set={editing}
          setNumber={editingIndex + 1}
          above={undo}
          onDone={() => setEditingId(null)}
        />
      )}
      <SetEntry
        hidden={editing !== null}
        above={undo}
        exerciseId={data.exercise.id}
        prefill={prefill}
        edit={entryEdit}
        onEdit={setEntryEdit}
        history={data.history}
        onRecord={(set, prs) => setRecord({ set, prs })}
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
            <SetHistory history={table.earlier} now={now} onDelete={remove} title={null} />
          </div>
        </details>
      )}
    </div>
  );
}
