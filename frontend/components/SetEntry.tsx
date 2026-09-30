"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { detectPR, type PR } from "@/lib/domain/prs";
import {
  parseReps,
  parseWeight,
  stepReps,
  stepWeight,
  type Entry,
  type Prefill,
} from "@/lib/domain/entry";
import type { SetLog } from "@/lib/domain/types";
import { formatNumber, formatSet } from "@/lib/format";
import { logSet, updateSet } from "@/lib/writes";
import { useSheetFooter } from "./Sheet";

// A second tap this soon after a log is almost certainly a double-tap, not another set.
const DOUBLE_TAP_GUARD_MS = 600;

// The entry form for the next set. Untouched, it shows the prefill in a muted "ghost" style —
// last time's same set number, else your last set today (prefillFor) — and "Log" records exactly
// what's shown, so repeating a set is one tap. Editing either number makes both solid, and the
// edit carries on to the following sets until you leave the sheet. Nothing here is stored except
// that throwaway edit.
export function SetEntry({
  exerciseId,
  prefill,
  history,
  onRecord,
  above,
  hidden = false,
}: {
  exerciseId: string;
  prefill: Prefill;
  // This exercise's sets as they stood before the tap — what a new set is judged against.
  history: readonly SetLog[];
  // A logged set broke a record; the sheet shows the banner.
  onRecord: (set: SetLog, prs: PR[]) => void;
  // Shown over the Log button, e.g. the Undo snackbar.
  above?: ReactNode;
  // True while a set is being edited: the form steps aside but stays mounted, so an edit you'd
  // made for the next set is still there when you come back.
  hidden?: boolean;
}) {
  const [edit, setEdit] = useState<Entry | null>(null); // null = untouched, follows the prefill
  const [failed, setFailed] = useState(false);
  const lastLogAt = useRef(0);
  // Inside a sheet, the Log button goes in the sheet's footer; on a full page it pins itself.
  const footer = useSheetFooter();

  const entry = edit ?? prefill.entry;
  const ghost = edit === null;

  async function handleLog() {
    const tappedAt = Date.now();
    if (tappedAt - lastLogAt.current < DOUBLE_TAP_GUARD_MS) return;
    lastLogAt.current = tappedAt;
    // Drop focus so a half-typed value isn't left on screen and the keypad closes.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setFailed(false);
    try {
      // Every set logged here is a working set. The set type stays in the data (kind), with no
      // picker on screen for now; bringing the chips back needs no data change.
      const set = await logSet({
        exercise_id: exerciseId,
        weight: entry.weight,
        reps: entry.reps,
        kind: "working",
      });
      const prs = detectPR(set, history);
      if (prs.length > 0) onRecord(set, prs);
    } catch {
      setFailed(true);
    }
  }

  if (hidden) return null;

  // Everything you touch mid-set lives in the pinned footer, so it never scrolls away however many
  // sets the table above has grown to.
  return (
    <Pinned footer={footer}>
      <div className="relative mx-auto flex max-w-md flex-col gap-3">
        {above}
        <Steppers
          entry={entry}
          ghost={ghost}
          onWeight={(weight) => setEdit({ ...entry, weight })}
          onReps={(reps) => setEdit({ ...entry, reps })}
        />
        {failed && (
          <p role="alert" className="text-center text-sm font-semibold text-negative-deep">
            Couldn&apos;t save that set. Try again.
          </p>
        )}
        <button
          type="button"
          onClick={handleLog}
          className="h-14 w-full touch-manipulation rounded-pill bg-primary text-lg font-bold text-on-primary active:bg-primary-active"
        >
          Log {formatSet(entry)}
        </button>
      </div>
    </Pinned>
  );
}

// Editing one of today's sets in place (Figma 3.3): the same steppers, loaded with that set's
// numbers, under a lime outline, with Cancel and Save set N where the Log button was. Saving
// changes only the weight and reps (updateSet); the set keeps its time and its place.
export function SetEdit({
  set,
  setNumber,
  above,
  onDone,
}: {
  set: SetLog;
  setNumber: number;
  // Shown over the buttons, e.g. the Undo snackbar.
  above?: ReactNode;
  // Save or Cancel finished; back to logging.
  onDone: () => void;
}) {
  const [entry, setEntry] = useState<Entry>({ weight: set.weight, reps: set.reps });
  const [failed, setFailed] = useState(false);
  const footer = useSheetFooter();

  async function save() {
    setFailed(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    try {
      await updateSet(set.id, entry);
      onDone();
    } catch {
      setFailed(true);
    }
  }

  return (
    <Pinned footer={footer}>
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {above}
        <Steppers
          outlined
          entry={entry}
          ghost={false}
          onWeight={(weight) => setEntry({ ...entry, weight })}
          onReps={(reps) => setEntry({ ...entry, reps })}
        />
        {failed && (
          <p role="alert" className="text-center text-sm font-semibold text-negative-deep">
            Couldn&apos;t save that set. Try again.
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDone}
            className="h-14 flex-1 touch-manipulation rounded-pill border border-line text-lg font-semibold text-ink active:bg-line"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            className="h-14 flex-1 touch-manipulation rounded-pill bg-primary text-lg font-bold text-on-primary active:bg-primary-active"
          >
            Save set {setNumber}
          </button>
        </div>
      </div>
    </Pinned>
  );
}

// The primary actions live in the thumb zone: in the sheet's footer, or pinned to the bottom of
// the screen on the full page.
function Pinned({ footer, children }: { footer: HTMLElement | null; children: ReactNode }) {
  if (footer) {
    return createPortal(
      // A rounded top edge rather than a straight rule, so the pinned entry reads as a panel of its own.
      <div className="rounded-t-card border-t border-line bg-page px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.4)]">
        {children}
      </div>,
      footer,
    );
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 rounded-t-card border-t border-line bg-page px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.4)]">
      {children}
    </div>
  );
}

// The entry card over the Log (or Save) button: weight above reps, nothing else.
function Steppers({
  outlined = false,
  entry,
  ghost,
  onWeight,
  onReps,
}: {
  // A lime outline, while one of today's sets is being edited.
  outlined?: boolean;
  entry: Entry;
  ghost: boolean;
  onWeight: (weight: number) => void;
  onReps: (reps: number) => void;
}) {
  return (
    <section className={`rounded-card bg-card px-4 py-4 ${outlined ? "ring-2 ring-primary" : ""}`}>
      <div className="flex flex-col gap-8">
        <Stepper
          label="Weight"
          unit="kg"
          value={entry.weight}
          ghost={ghost}
          inputMode="decimal"
          format={formatNumber}
          parse={parseWeight}
          step={stepWeight}
          onChange={onWeight}
        />
        <Stepper
          label="Reps"
          unit="reps"
          value={entry.reps}
          ghost={ghost}
          inputMode="numeric"
          format={String}
          parse={parseReps}
          step={stepReps}
          onChange={onReps}
        />
      </div>
    </section>
  );
}

// One number with − and + buttons. Tapping the number lets you type it (the keypad only
// appears when you ask for it); the ± buttons cover the common case.
function Stepper({
  label,
  unit,
  value,
  ghost,
  inputMode,
  format,
  parse,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  ghost: boolean;
  inputMode: "decimal" | "numeric";
  format: (value: number) => string;
  parse: (text: string) => number | null;
  step: (value: number, direction: 1 | -1) => number;
  onChange: (value: number) => void;
}) {
  // What's being typed, while the field has focus; null otherwise, so it shows the value.
  const [draft, setDraft] = useState<string | null>(null);
  // The value when the field was tapped, to fall back on if you leave it empty.
  const atFocus = useRef(value);

  function nudge(direction: 1 | -1) {
    setDraft(null);
    onChange(step(value, direction));
  }

  return (
    <div className="flex items-center gap-3">
      <StepButton label={`Decrease ${label.toLowerCase()}`} onClick={() => nudge(-1)} sign="minus" />
      {/* The unit sits beside the number rather than under it, which keeps the pinned card short. */}
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <input
          type="text"
          inputMode={inputMode}
          enterKeyHint="done"
          autoComplete="off"
          aria-label={`${label} in ${unit}`}
          // Tapping empties the field and shows the value faintly behind it, so what you type
          // replaces it without a selection to paint blue. Leave it empty and nothing changes.
          value={draft ?? format(value)}
          placeholder={format(value)}
          // As wide as what it shows, so the unit follows the number.
          style={{ width: `${Math.max(1, (draft || format(value)).length) + 0.1}ch` }}
          onFocus={() => {
            atFocus.current = value;
            setDraft("");
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = parse(event.target.value);
            if (parsed !== null) onChange(parsed);
          }}
          onBlur={() => {
            if ((draft === null || parse(draft) === null) && value !== atFocus.current) {
              onChange(atFocus.current); // typed, then cleared: keep what was there
            }
            setDraft(null);
          }}
          // No focus box: the emptied field and its faint placeholder already show where you're
          // typing.
          className={`min-w-0 bg-transparent text-center text-4xl font-black tabular-nums outline-none placeholder:text-body ${
            ghost ? "text-body" : "text-ink"
          }`}
        />
        <span className="shrink-0 text-sm text-body">{unit}</span>
      </label>
      <StepButton label={`Increase ${label.toLowerCase()}`} onClick={() => nudge(1)} sign="plus" />
    </div>
  );
}

// The sign is drawn, not typed: a text "+" sits wherever the font's baseline puts it, which is
// visibly off-centre in a circle this size.
function StepButton({
  label,
  onClick,
  sign,
}: {
  label: string;
  onClick: () => void;
  sign: "plus" | "minus";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-pill bg-page text-ink active:bg-line"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        className="h-6 w-6"
      >
        <path d={sign === "plus" ? "M12 5v14M5 12h14" : "M5 12h14"} />
      </svg>
    </button>
  );
}
