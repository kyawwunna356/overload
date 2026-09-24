"use client";

import type { SessionSummary } from "@/lib/domain/sessions";
import { formatKg, formatSet, prKindLabel } from "@/lib/format";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useSessionRecap } from "@/lib/hooks/useSessionRecap";
import { PRPill } from "./PRPill";

// What the workout was worth, at the top of a session's summary once it's over — finished by hand
// or closed by the 90-minute gap. One number for the weight moved, the records broken and the
// lifts levelled up; empty parts are simply left out, and nothing compares you with another day.
//
// "Over" comes from useActiveSession, the same live clock the End bar uses, so the card appears
// the instant the bar goes, even if the page was left open while the gap passed.
export function SessionRecap({ summary }: { summary: SessionSummary }) {
  const state = useActiveSession();
  const recap = useSessionRecap(summary.session);
  if (state === undefined || recap === undefined) return null;
  if (state.session?.id === summary.session.id) return null;

  const names = new Map(
    summary.groups.flatMap((group) => (group.exercise ? [[group.exercise.id, group.exercise.name]] : [])),
  );
  const nameOf = (id: string) => names.get(id) ?? "Unknown exercise";

  return (
    <section aria-label="Recap" className="rounded-card bg-card px-6 py-5">
      <p className="font-display text-4xl font-black leading-none tracking-tight tabular-nums text-ink">
        {formatKg(recap.totalKg)}
      </p>
      <p className="pt-1 text-body">lifted</p>

      {recap.prs.length > 0 && (
        <div className="pt-5">
          <h2 className="pb-2 text-sm font-semibold text-body">Records</h2>
          <ul className="flex flex-col gap-3">
            {recap.prs.map(({ set, prs }) => (
              <li key={set.id}>
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <PRPill prs={prs} />
                  <span className="min-w-0">
                    {nameOf(set.exercise_id)} · <span className="tabular-nums">{formatSet(set)}</span>
                  </span>
                </p>
                <p className="text-sm text-body">{prs.map((pr) => prKindLabel(pr.kind)).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recap.levelUps.length > 0 && (
        <div className="pt-5">
          <h2 className="pb-2 text-sm font-semibold text-body">Levels</h2>
          <ul className="flex flex-col gap-1">
            {recap.levelUps.map((up) => (
              <li key={up.exerciseId} className="text-ink">
                {nameOf(up.exerciseId)} reached{" "}
                <span className="font-semibold">Level {up.level}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
