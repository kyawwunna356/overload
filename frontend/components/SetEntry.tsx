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
import { SET_KINDS, type SetKind, type SetLog } from "@/lib/domain/types";
import { formatDaysAgo, formatNumber, formatSet, kindLabel } from "@/lib/format";
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
  const [kind, setKind] = useState<SetKind>("working");
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
      const set = await logSet({ exercise_id: exerciseId, weight: entry.weight, reps: entry.reps, kind });
      const prs = detectPR(set, history);
      if (prs.length > 0) setFlash({ setId: set.id, prs });
      // Back to Working, so a forgotten chip can't turn working sets into warmups.
      setKind("working");
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
          <div role="radiogroup" aria-label="Set type" className="flex gap-2">
            {SET_KINDS.map((option) => {
              const selected = option === kind;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setKind(option)}
                  className={`h-11 flex-1 touch-manipulation rounded-pill text-sm font-semibold ${
                    selected
                      ? "bg-primary-pale text-ink-deep ring-2 ring-inset ring-ink-deep"
                      : "bg-page text-ink"
                  }`}
                >
                  {kindLabel(option)}
                </button>
              );
            })}
          </div>
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

  function nudge(direction: 1 | -1) {
    setDraft(null);
    onChange(step(value, direction));
  }

  return (
    <div className="flex items-center gap-3">
      <RoundButton label={`Decrease ${label.toLowerCase()}`} onClick={() => nudge(-1)}>
        −
      </RoundButton>
      <label className="flex min-w-0 flex-1 flex-col items-center">
        <input
          type="text"
          inputMode={inputMode}
          enterKeyHint="done"
          autoComplete="off"
          aria-label={`${label} in ${unit}`}
          value={draft ?? format(value)}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = parse(event.target.value);
            if (parsed !== null) onChange(parsed);
          }}
          onBlur={() => setDraft(null)}
          className={`w-full bg-transparent text-center text-5xl font-black tabular-nums ${
            ghost ? "text-body" : "text-ink"
          }`}
        />
        <span className="text-sm text-body">{unit}</span>
      </label>
      <RoundButton label={`Increase ${label.toLowerCase()}`} onClick={() => nudge(1)}>
        +
      </RoundButton>
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-14 w-14 shrink-0 touch-manipulation rounded-pill bg-page text-3xl font-semibold text-ink active:bg-line"
    >
      {children}
    </button>
  );
}
