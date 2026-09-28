"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { elapsed, formatElapsed } from "@/lib/domain/timers";
import { countLabel, formatSetShort, formatTime } from "@/lib/format";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useSessionSummary } from "@/lib/hooks/useSessionSummary";
import { forgetSheet, replaceSheet } from "@/lib/sheets";
import { endSession } from "@/lib/writes";
import { CoverageStrip } from "./CoverageStrip";
import { useSheetFooter } from "./Sheet";

// The session you're in, opened from the live bar (`?live`). Here the session clock is the one
// big number and rest drops to a line, so two prominent counters never share a screen. Then which
// patterns you've covered, and what you've done in the order you did it; a card opens that
// exercise's log sheet in place. End lives at the bottom (Hard Rule 2): optional, always there
// while the session runs, never required — the gap still closes a forgotten session.
//
// Everything is derived: the clock is now − first set (Hard Rule 4), the rest is from Dexie.
export function LiveSession() {
  const state = useActiveSession();
  const session = state?.session ?? null;
  const data = useSessionSummary(session?.id ?? null);

  if (state === undefined) return null;
  if (!session) {
    return (
      <p className="mt-4 rounded-card bg-raised px-6 py-5 text-body">
        No session is running. Your next set starts one.
      </p>
    );
  }

  const groups = data?.summary?.groups ?? [];

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="pt-2 text-center">
        <p className="text-xs font-semibold tracking-wide text-mute uppercase">
          Session · started {formatTime(session.started_at)}
        </p>
        <p className="font-display text-7xl font-black leading-none tracking-tight text-ink tabular-nums">
          {formatElapsed(elapsed(session.started_at, state.now))}
        </p>
        <p className="pt-2 text-body tabular-nums">
          Rest {formatElapsed(elapsed(session.last_set_at, state.now))} ·{" "}
          {countLabel(session.sets.length, "set")}
        </p>
      </header>

      <CoverageStrip />

      <ul className="-mt-6 flex flex-col gap-3">
        {groups.map((group) =>
          group.exercise ? (
            <li key={group.exercise.id}>
              <button
                type="button"
                onClick={() => group.exercise && replaceSheet("log", group.exercise.id)}
                className="flex w-full touch-manipulation items-center gap-3 rounded-card bg-raised px-5 py-4 text-left active:bg-line"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-ink">{group.exercise.name}</span>
                  <span className="block text-body tabular-nums">
                    {group.sets.map(formatSetShort).join(" · ")}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-2xl leading-none text-mute">
                  ›
                </span>
              </button>
            </li>
          ) : null,
        )}
      </ul>

      <EndControls sessionId={session.id} />
    </div>
  );
}

// End session, in the sheet's footer. It only asks: End opens the choice, and nothing is written
// until you pick Finish. Resume goes back with the session and its timers untouched. The red Finish
// is final: it writes the end marker, and your next set opens a new session. Resume is the bottom
// button, exactly where End was, so a double tap on End can never finish (Figma 4.2).
function EndControls({ sessionId }: { sessionId: string }) {
  const footer = useSheetFooter();
  const state = useActiveSession();
  const router = useRouter();
  // Throwaway UI state: whether the choice is showing. Never stored.
  const [choosing, setChoosing] = useState(false);
  const [failed, setFailed] = useState(false);

  const session = state?.session;
  if (!footer || !session || session.id !== sessionId) return null;

  const finish = async () => {
    setFailed(false);
    try {
      await endSession(session);
      // Land on the summary, replacing the sheet's history entry so back goes to the page you
      // were on. `finished` tells it to play the deck once; it drops the flag straight away.
      forgetSheet();
      router.replace(`/session?id=${encodeURIComponent(session.id)}&finished=1`);
    } catch {
      setFailed(true);
    }
  };

  return createPortal(
    <div className="flex flex-col gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {failed && (
        <p role="alert" className="text-center text-sm font-semibold text-negative-deep">
          Couldn&apos;t save that. Try again.
        </p>
      )}
      {choosing && (
        <div role="group" aria-label="End this session?" className="flex flex-col gap-3 motion-safe:animate-sheet-in">
          <div className="px-2">
            <p className="text-xl font-semibold text-ink">End this session?</p>
            <p className="pt-1 text-body">
              Finishing is final — your next set starts a new session. Walking away works too: it
              closes itself after 90 minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void finish()}
            className="h-14 w-full touch-manipulation rounded-pill bg-negative text-lg font-semibold text-ink active:opacity-80"
          >
            Finish session
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setChoosing((open) => !open)}
        className="h-14 w-full touch-manipulation rounded-pill border border-line text-lg font-semibold text-ink active:bg-line"
      >
        {choosing ? "Resume" : "End session"}
      </button>
    </div>,
    footer,
  );
}
