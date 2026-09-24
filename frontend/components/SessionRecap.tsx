"use client";

import type { LevelUp, Recap } from "@/lib/domain/recap";
import type { SetPRs } from "@/lib/domain/prs";
import type { SessionSummary } from "@/lib/domain/sessions";
import { muscleBalance, topMuscle } from "@/lib/domain/muscles";
import { formatKg, formatSet, muscleLabel, prKindLabel } from "@/lib/format";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { MuscleStar } from "./MuscleStar";
import { PRPill } from "./PRPill";

// What the workout was worth, at the top of a session's summary once it's over — finished by hand
// or closed by the 90-minute gap. The total is always in view; Muscles, Records and Levels are folded
// rows you tap to open, so the summary stays compact after the finish moment has had its say. Empty
// parts are left out, and nothing compares you with another day.
//
// "Over" comes from useActiveSession, the same live clock the End bar uses, so the card appears
// the instant the bar goes, even if the page was left open while the gap passed.
export function SessionRecap({ summary, recap }: { summary: SessionSummary; recap: Recap | undefined }) {
  const state = useActiveSession();
  if (state === undefined || recap === undefined) return null;
  if (state.session?.id === summary.session.id) return null;

  const nameOf = exerciseNames(summary);
  const balance = muscleBalance(summary.groups);
  const top = topMuscle(balance);

  return (
    <section aria-label="Recap" className="rounded-card bg-card px-6 py-5">
      <p className="font-display text-4xl font-black leading-none tracking-tight tabular-nums text-ink">
        {formatKg(recap.totalKg)}
      </p>
      <p className="pt-1 text-body">lifted</p>

      {top !== null && (
        <Fold title="Muscles" detail={muscleLabel(top)}>
          <MuscleStar balance={balance} />
        </Fold>
      )}

      {recap.prs.length > 0 && (
        <Fold title="Records" detail={String(recap.prs.length)}>
          <ul className="flex flex-col gap-3">
            {recap.prs.map((entry) => (
              <RecordLine key={entry.set.id} entry={entry} name={nameOf(entry.set.exercise_id)} />
            ))}
          </ul>
        </Fold>
      )}

      {recap.levelUps.length > 0 && (
        <Fold title="Levels" detail={String(recap.levelUps.length)}>
          <ul className="flex flex-col gap-1">
            {recap.levelUps.map((up) => (
              <LevelLine key={up.exerciseId} up={up} name={nameOf(up.exerciseId)} />
            ))}
          </ul>
        </Fold>
      )}
    </section>
  );
}

// A folded row: tap the title to open it, tap again to close it. Native <details>, so it works
// with the keyboard and VoiceOver and needs no state. `detail` follows the title in grey — a
// count, or for Muscles the group the session leaned on most.
function Fold({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <details className="group mt-4 border-t border-line pt-3">
      <summary className="flex min-h-11 cursor-pointer touch-manipulation list-none items-center justify-between font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span>
          {title} <span className="text-body">· {detail}</span>
        </span>
        <span aria-hidden className="text-2xl leading-none text-mute transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="pt-2 pb-1">{children}</div>
    </details>
  );
}

// Exercise names for a session's ids; an exercise missing from this device reads as unknown.
export function exerciseNames(summary: SessionSummary): (id: string) => string {
  const names = new Map<string, string>();
  for (const group of summary.groups) {
    if (group.exercise) names.set(group.exercise.id, group.exercise.name);
  }
  return (id) => names.get(id) ?? "Unknown exercise";
}

export function RecordLine({ entry, name }: { entry: SetPRs; name: string }) {
  return (
    <li>
      <p className="flex items-center gap-2 font-semibold text-ink">
        <PRPill prs={entry.prs} />
        <span className="min-w-0">
          {name} · <span className="tabular-nums">{formatSet(entry.set)}</span>
        </span>
      </p>
      <p className="text-sm text-body">{entry.prs.map((pr) => prKindLabel(pr.kind)).join(" · ")}</p>
    </li>
  );
}

// A lift that levelled up: its name, and a gold badge with a hopping double arrow and the level
// it reached. Gold keeps levels apart from the green of records.
export function LevelLine({ up, name }: { up: LevelUp; name: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="min-w-0 font-semibold text-ink">{name}</span>
      <span
        className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-level-pale py-1 pr-3 pl-2 text-sm font-black text-level"
      >
        <LevelUpArrow />
        Level {up.level}
      </span>
    </li>
  );
}

function LevelUpArrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 motion-safe:animate-level-up"
    >
      <path d="M6 12l6-6 6 6M6 19l6-6 6 6" />
    </svg>
  );
}
