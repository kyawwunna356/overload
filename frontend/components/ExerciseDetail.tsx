"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { exerciseRecords, type Best } from "@/lib/domain/exerciseHistory";
import { dayLabel, groupByDay } from "@/lib/domain/history";
import type { SetLog } from "@/lib/domain/types";
import { formatNumber, formatSet, patternLabel } from "@/lib/format";
import { useLogSheet } from "@/lib/hooks/useLogSheet";
import { useNow } from "@/lib/hooks/useNow";
import { deleteExercise, deleteSet, restoreSet } from "@/lib/writes";
import { BackLink } from "./BackLink";
import { LevelBadge } from "./LevelBadge";
import { LogLink } from "./LogLink";
import { SetEdit } from "./SetEntry";
import { SetHistory } from "./SetHistory";
import { Snackbar } from "./Snackbar";

// One lift's page under History (`?id=`): its name and level, the best you've done at it, a way to
// log a set, and every set you've ever logged of it by day. Past sets can be fixed here — tap one
// to edit it in the same pinned card as the log sheet (the set keeps its time, so its session,
// records and summary simply recompute), swipe it left to delete it, with Undo. At the bottom the
// whole lift can be deleted for good, sets and all. A static page that reads the local database, so
// it opens with no signal; nothing on it is stored.
export function ExerciseDetail() {
  const id = useSearchParams().get("id");
  const data = useLogSheet(id);
  const now = useNow();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<SetLog | null>(null);
  const hideDeleted = useCallback(() => setDeleted(null), []);
  const remove = useCallback(async (set: SetLog) => {
    await deleteSet(set.id);
    setDeleted(set);
    setEditingId((current) => (current === set.id ? null : current));
  }, []);

  const history = data?.history;
  const records = useMemo(() => (history ? exerciseRecords(history) : null), [history]);
  // The set being edited, looked up afresh so a delete closes the editor; numbered within its day.
  const editing = useMemo(() => {
    if (!history || editingId === null) return null;
    const set = history.find((candidate) => candidate.id === editingId);
    if (!set) return null;
    const day = groupByDay(history, now).find((group) => group.sets.some((s) => s.id === set.id));
    const oldestFirst = day ? [...day.sets].reverse() : [set];
    return { set, number: oldestFirst.findIndex((s) => s.id === set.id) + 1 };
  }, [history, editingId, now]);

  if (data === undefined) return null;

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

  return (
    // Room under the last set for the pinned edit card while it's open.
    <div className={editing ? "pb-72" : "pb-8"}>
      <nav className="pb-4">
        <BackLink href="/history?view=exercises" label="‹ History" plain />
      </nav>
      {/* A deleted lift is archived, never shown: its page reads as gone. */}
      {data.exercise === null || data.exercise.archived ? (
        <p className="rounded-card bg-card px-6 py-5 text-body">That exercise isn&apos;t on this device.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <header className="px-2">
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
          </header>

          {records && <RecordsCard records={records} now={now} />}

          <LogLink
            exerciseId={data.exercise.id}
            className="flex h-14 touch-manipulation items-center justify-center rounded-pill bg-primary text-lg font-bold text-on-primary active:bg-primary-active"
          >
            Log a set
          </LogLink>

          <SetHistory
            history={data.history}
            now={now}
            onDelete={remove}
            onEdit={(set) => setEditingId((current) => (current === set.id ? null : set.id))}
            editingId={editing?.set.id ?? null}
            title={null}
          />

          <DeleteExercise exerciseId={data.exercise.id} name={data.exercise.name} />
        </div>
      )}

      {editing ? (
        <SetEdit
          key={editing.set.id}
          set={editing.set}
          setNumber={editing.number}
          above={undo}
          onDone={() => setEditingId(null)}
        />
      ) : (
        undo && <PinnedNote>{undo}</PinnedNote>
      )}
    </div>
  );
}

// The best you've done at this lift, one row each with the day it happened. Facts, not targets:
// there's no "next goal" and no trend. Left out for a lift with no working sets.
function RecordsCard({ records, now }: { records: ReturnType<typeof exerciseRecords>; now: number }) {
  const rows: { label: string; best: Best; value: ReactNode }[] = [];
  if (records.heaviest) {
    rows.push({ label: "Heaviest", best: records.heaviest, value: formatSet(records.heaviest.set) });
  }
  if (records.bestE1rm) {
    rows.push({
      label: "Best est. 1RM",
      best: records.bestE1rm,
      value: `${formatNumber(Math.round(records.bestE1rm.value * 10) / 10)} kg`,
    });
  }
  if (records.mostReps) {
    const { set } = records.mostReps;
    rows.push({
      label: "Most reps",
      best: records.mostReps,
      value: `${set.reps} × ${set.weight === 0 ? "BW" : `${formatNumber(set.weight)} kg`}`,
    });
  }
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="records-heading" className="rounded-card bg-card px-5 py-4">
      <h2 id="records-heading" className="pb-2 text-sm font-semibold tracking-wide text-mute uppercase">
        Records
      </h2>
      <dl className="flex flex-col divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-3 py-2.5">
            <dt className="w-28 shrink-0 text-sm text-body">{row.label}</dt>
            <dd className="min-w-0 flex-1 text-base font-semibold tabular-nums text-record">{row.value}</dd>
            <dd className="shrink-0 text-xs text-mute">{dayLabel(row.best.set.logged_at, now)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Deleting the lift for good: the button opens a choice, Cancel or a red Delete, like End session's,
// and only a one-line warning (the user's choice). Afterwards back to History's exercises, replacing this
// page so back doesn't return to a lift that's gone.
function DeleteExercise({ exerciseId, name }: { exerciseId: string; name: string }) {
  const router = useRouter();
  // Throwaway UI state: whether the choice is showing. Never stored.
  const [choosing, setChoosing] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = async () => {
    setFailed(false);
    try {
      await deleteExercise(exerciseId);
      router.replace("/history?view=exercises");
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-4">
      {failed && (
        <p role="alert" className="text-center text-sm font-semibold text-negative-deep">
          Couldn&apos;t delete that. Try again.
        </p>
      )}
      {choosing && (
        <div role="group" aria-label={`Delete ${name}?`} className="flex flex-col gap-3 motion-safe:animate-sheet-in">
          <div className="px-2">
            <p className="text-xl font-semibold break-words text-ink">Delete {name}?</p>
            <p className="pt-1 text-body">This action can&apos;t be undone.</p>
          </div>
          <button
            type="button"
            onClick={() => void confirm()}
            className="h-14 w-full touch-manipulation rounded-pill bg-negative text-lg font-semibold text-ink active:opacity-80"
          >
            Delete
          </button>
        </div>
      )}
      <button
        type="button"
        aria-expanded={choosing}
        onClick={() => setChoosing((open) => !open)}
        className={`h-14 w-full touch-manipulation rounded-pill border border-line text-lg font-semibold active:bg-line ${
          choosing ? "text-ink" : "text-negative-deep"
        }`}
      >
        {choosing ? "Cancel" : "Delete exercise"}
      </button>
    </div>
  );
}

// The Undo snackbar pinned to the bottom of the screen, over the tab bar for its few seconds.
function PinnedNote({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  );
}
