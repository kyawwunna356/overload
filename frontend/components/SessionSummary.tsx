"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { muscleBalance, topMuscle } from "@/lib/domain/muscles";
import { elapsed, formatElapsed } from "@/lib/domain/timers";
import { sessionStats } from "@/lib/domain/recap";
import { formatLongDay, formatSet, formatSpan, formatTime, formatWhole, kindLabel, patternLabel } from "@/lib/format";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useNow } from "@/lib/hooks/useNow";
import { useSessionRecap } from "@/lib/hooks/useSessionRecap";
import { useSessionSummary } from "@/lib/hooks/useSessionSummary";
import {
  SESSION_GAP_MINUTES,
  activeSession,
  type SessionSummary as Summary,
} from "@/lib/domain/sessions";
import { LogLink } from "./LogLink";
import { scrollPageToTop } from "@/lib/page";
import { replaceSheet } from "@/lib/sheets";
import { RecapMoment } from "./RecapMoment";
import { MusclesCard } from "./MusclesCard";
import { hasRewards, RewardList } from "./RewardList";
import { durationText, StatRow } from "./StatRow";

// What you did in one session, chosen by `?id=` in the URL (a session's id is its first set's
// id): the date and times, the stat row, then — once it's over — the rewards and the muscle star,
// open, because they're the payoff; then the exercises. It sits under the History tab (the tab bar
// shows with History lit) and its back link goes there, which is also where Finish's deck leaves
// you. A static page that reads the id in the browser, so it opens with no signal, and every
// number on it is derived from the sets in the local database. It's read-only: it never asks
// whether you finished anything, and deleting a set stays on the log sheet.
export function SessionSummary() {
  const params = useSearchParams();
  const id = params.get("id");
  const data = useSessionSummary(id);
  const now = useNow();
  const summary = data?.summary ?? null;
  const recap = useSessionRecap(summary?.session ?? null);
  // True from the moment you tap Finish until you close the recap cards. Finish on the live screen
  // lands here with `finished=1`; the flag is read once and dropped from the URL straight away, so
  // a reload or a later visit never replays the deck. Never stored: the moment belongs to the tap,
  // and the summary keeps the recap itself.
  //
  // The flag can also arrive while this page is already showing — finishing from the live sheet
  // over this same summary — so it's watched, not only read on the first render. Setting state while
  // rendering, on the change, is React's way to follow a prop without an extra effect pass.
  const finished = params.has("finished");
  const [celebrating, setCelebrating] = useState(finished);
  const [sawFinished, setSawFinished] = useState(finished);
  if (finished !== sawFinished) {
    setSawFinished(finished);
    if (finished) setCelebrating(true);
  }
  useEffect(() => {
    if (!params.has("finished") || id === null) return;
    window.history.replaceState(null, "", `/session?id=${encodeURIComponent(id)}`);
  }, [params, id]);

  // A link to the session you're still in opens the live screen over it, once: that's where the
  // running session lives now, End included.
  const sentLive = useRef(false);
  const running = summary !== null && activeSession([summary.session], now, SESSION_GAP_MINUTES) !== null;
  useEffect(() => {
    if (!running || sentLive.current || params.has("live")) return;
    sentLive.current = true;
    replaceSheet("live", "1");
  }, [running, params]);
  const closeMoment = useCallback(() => {
    setCelebrating(false);
    // The compact recap sits at the top of the page; bring it into view.
    scrollPageToTop();
  }, []);

  return (
    <div className="pb-8">
      <nav className="pb-3">
        {/* A plain link: /history is precached, so it opens with no signal. */}
        <Link
          href="/history"
          className="-m-2 inline-flex touch-manipulation items-center gap-1 p-2 text-base font-semibold text-primary active:text-primary-active"
        >
          <span aria-hidden className="text-xl leading-none">‹</span> History
        </Link>
      </nav>

      {data === undefined ? null : summary === null ? (
        <p className="rounded-card bg-card px-6 py-5 text-body">
          That session isn&apos;t on this device.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <header className="px-2 pb-1">
            {/* text-3xl, not the tab pages' 4xl: the longest date, "Wednesday, 30 Sep", fits one line. */}
            <h1 className="font-display text-3xl font-black leading-none tracking-tight text-ink">
              {formatLongDay(summary.session.started_at, now)}
            </h1>
            <p className="pt-2 text-body tabular-nums">
              {formatSpan(summary.session.started_at, summary.session.ended_at ?? summary.session.last_set_at)}
              {!running && ` · ${durationText(summary.durationMs)}`}
            </p>
          </header>

          <LiveStatRow summary={summary} />

          <WhenOver sessionId={summary.session.id}>
            {recap && hasRewards(recap) && (
              <section className="flex flex-col gap-3 pt-3">
                <h2 className="px-2 text-xl font-semibold tracking-tight text-ink">Rewards</h2>
                <RewardList recap={recap} summary={summary} />
              </section>
            )}
            {topMuscle(muscleBalance(summary.groups)) !== null && (
              <MusclesCard balance={muscleBalance(summary.groups)} />
            )}
          </WhenOver>

          <h2 className="px-2 pt-3 text-xl font-semibold tracking-tight text-ink">Exercises</h2>
          {summary.groups.map((group) => (
            <section key={group.sets[0].exercise_id} className="overflow-hidden rounded-card bg-card">
              {group.exercise ? (
                <LogLink
                  exerciseId={group.exercise.id}
                  className="block min-h-16 touch-manipulation px-6 py-3 active:bg-page"
                >
                  <h3 className="text-lg font-semibold text-ink">{group.exercise.name}</h3>
                  <p className="text-sm text-body">{patternLabel(group.exercise.pattern)}</p>
                </LogLink>
              ) : (
                <div className="min-h-16 px-6 py-3">
                  <h3 className="text-lg font-semibold text-ink">Unknown exercise</h3>
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
          {celebrating && recap && (
            <RecapMoment summary={summary} recap={recap} onClose={closeMoment} />
          )}
        </div>
      )}
    </div>
  );
}

// The stat row for this page. While it's the session you're in, Duration counts up live —
// `now − first set` every repaint (Hard Rule 4) — and this row owns that clock, so only it repaints
// each tick. Once it's over, the length is fixed.
function LiveStatRow({ summary }: { summary: Summary }) {
  const state = useActiveSession();
  const stats = sessionStats(summary);
  const live = state !== undefined && state.session?.id === summary.session.id;
  return (
    <StatRow
      duration={live ? formatElapsed(elapsed(summary.session.started_at, state.now)) : durationText(stats.durationMs)}
      sets={stats.sets}
      kg={formatWhole(stats.kg)}
    />
  );
}

// The rewards belong to a finished session, so they appear the instant it ends — by Finish or the
// 90-minute gap — on the same live clock the bar uses.
function WhenOver({ sessionId, children }: { sessionId: string; children: ReactNode }) {
  const state = useActiveSession();
  if (state === undefined || state.session?.id === sessionId) return null;
  return <>{children}</>;
}
