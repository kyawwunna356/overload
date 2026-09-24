"use client";

import { useCallback, useRef, useState } from "react";
import { detectPR, type PR } from "@/lib/domain/prs";
import {
  parseReps,
  parseWeight,
  prefillFrom,
  stepReps,
  stepWeight,
  type Entry,
} from "@/lib/domain/entry";
import type { SetLog } from "@/lib/domain/types";
import { formatDaysAgo, formatNumber, formatSet } from "@/lib/format";
import { logSet } from "@/lib/writes";
import { PRFlash } from "./PRFlash";

// A second tap this soon after a log is almost certainly a double-tap, not another set.
const DOUBLE_TAP_GUARD_MS = 600;
const DAY_MS = 24 * 60 * 60 * 1000;

// The entry form. It starts as a copy of the last working set shown in a muted "ghost"
// style; "Log set" records exactly what's shown, so repeating a set is one tap. Editing
// either number makes both solid. Nothing here is stored except the throwaway edit state —
// the ghost values are derived from the previous set.
export function SetEntry({
  exerciseId,
  previous,
  history,
  now,
}: {
  exerciseId: string;
  previous: SetLog | null;
  // This exercise's sets as they stood before the tap — what a new set is judged against.
  history: readonly SetLog[];
  now: number;
}) {
  const [edit, setEdit] = useState<Entry | null>(null); // null = untouched, follows `previous`
  const [failed, setFailed] = useState(false);
  const [flash, setFlash] = useState<{ setId: string; prs: PR[] } | null>(null);
  const lastLogAt = useRef(0);
  // Stable, so the page's clock repaints don't restart the flash's countdown.
  const hideFlash = useCallback(() => setFlash(null), []);

  const entry = edit ?? prefillFrom(previous);
  const ghost = edit === null;

  async function handleLog() {
    const tappedAt = Date.now();
    if (tappedAt - lastLogAt.current < DOUBLE_TAP_GUARD_MS) return;
    lastLogAt.current = tappedAt;
    // Drop focus so a half-typed value isn't left on screen and the keypad closes.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setFailed(false);
    setFlash(null);
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
      if (prs.length > 0) setFlash({ setId: set.id, prs });
    } catch {
      setFailed(true);
    }
  }

  const caption = previous
    ? `Last time · ${formatSet(previous)} · ${formatDaysAgo((now - previous.logged_at) / DAY_MS)}`
    : "First time — set your weight";

  return (
    <>
      <section className="rounded-card bg-card p-6">
        <p className="pb-5 text-center text-sm text-body">{caption}</p>
        <div className="flex flex-col gap-6">
          <Stepper
            label="Weight"
            unit="kg"
            value={entry.weight}
            ghost={ghost}
            inputMode="decimal"
            format={formatNumber}
            parse={parseWeight}
            step={stepWeight}
            onChange={(weight) => setEdit({ ...entry, weight })}
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
            onChange={(reps) => setEdit({ ...entry, reps })}
          />
        </div>
      </section>

      {/* Pinned to the bottom of the screen: the primary action lives in the thumb zone. */}
      <div className="fixed inset-x-0 bottom-0 z-10 rounded-t-card bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto flex max-w-md flex-col gap-3">
          {/* Keyed by set, so back-to-back records each get their own entrance. */}
          {flash && <PRFlash key={flash.setId} prs={flash.prs} onDone={hideFlash} />}
          {failed && (
            <p role="alert" className="text-center text-sm font-semibold text-negative-deep">
              Couldn&apos;t save that set. Try again.
            </p>
          )}
          <button
            type="button"
            onClick={handleLog}
            className="h-16 w-full touch-manipulation rounded-pill bg-primary text-xl font-bold text-on-primary active:bg-primary-active"
          >
            Log {formatSet(entry)}
          </button>
        </div>
      </div>
    </>
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
      <RoundButton label={`Decrease ${label.toLowerCase()}`} onClick={() => nudge(-1)} sign="minus" />
      <label className="flex min-w-0 flex-1 flex-col items-center">
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
          className={`w-full bg-transparent text-center text-5xl font-black tabular-nums outline-none placeholder:text-body ${
            ghost ? "text-body" : "text-ink"
          }`}
        />
        <span className="text-sm text-body">{unit}</span>
      </label>
      <RoundButton label={`Increase ${label.toLowerCase()}`} onClick={() => nudge(1)} sign="plus" />
    </div>
  );
}

// The sign is drawn, not typed: a text "+" sits wherever the font's baseline puts it, which is
// visibly off-centre in a circle this size.
function RoundButton({
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
      className="flex h-14 w-14 shrink-0 touch-manipulation items-center justify-center rounded-pill bg-page text-ink active:bg-line"
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
