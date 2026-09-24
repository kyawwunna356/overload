"use client";

import { useState } from "react";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { endSession } from "@/lib/writes";

// The optional way to end a session yourself (Hard Rule 2). **End session** only asks: it opens
// a choice in the same bar, and nothing is written until you pick Finish. **Resume session**
// goes back, with the session and its timers untouched. The red **Finish session** ends it for
// good: it writes the end marker and nothing offers to undo it — your next set opens a new
// session. None of this is required: a forgotten session closes itself after 90 idle minutes.
//
// Pinned to the bottom of the summary, away from the Log button. The safe button (Resume) sits
// at the bottom where End was, so a double tap on End lands on Resume, never on Finish. Only the
// active session gets the bar: once it's finished or closed by the gap there is nothing to end.
// It owns its own clock (through useActiveSession), so only this bar repaints each tick.
export function SessionEndBar({ sessionId }: { sessionId: string }) {
  const state = useActiveSession();
  // Throwaway UI state: whether the choice is showing. Never stored.
  const [choosing, setChoosing] = useState(false);
  const [failed, setFailed] = useState(false);

  const session = state?.session;
  if (!session || session.id !== sessionId) return null;

  const finish = async () => {
    setFailed(false);
    try {
      await endSession(session);
      // The recap appears at the top of the summary; bring it into view.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFailed(true);
    }
  };

  const error = failed && (
    <p role="alert" className="text-center text-sm font-semibold text-negative-deep">
      Couldn&apos;t save that. Try again.
    </p>
  );

  return (
    <>
      <div className={`${BAR} z-10 bg-card`}>
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {!choosing && error}
          <BarButton onClick={() => setChoosing(true)}>End session</BarButton>
        </div>
      </div>

      {choosing && (
        <>
          {/* Dims the page so the sheet reads as in front of it. Tapping it goes back, like
              Resume: nothing was written. */}
          <div
            aria-hidden
            onClick={() => setChoosing(false)}
            className="fixed inset-0 z-20 bg-page/70 motion-safe:animate-scrim-in"
          />
          {/* Slides up over the End bar in the same card colour; the dimmed page behind it is what
              sets it apart. It's bottom-anchored like the bar, so Resume lands exactly where End
              was. */}
          <div
            role="group"
            aria-label="End this session?"
            className={`${BAR} z-30 bg-card shadow-2xl motion-safe:animate-sheet-in`}
          >
            <div className="mx-auto flex max-w-md flex-col gap-3">
              {error}
              <p className="text-center text-base font-semibold text-ink">End this session?</p>
              <button
                type="button"
                onClick={() => void finish()}
                className="h-14 w-full touch-manipulation rounded-pill bg-negative text-lg font-semibold text-ink active:opacity-80"
              >
                Finish session
              </button>
              <BarButton onClick={() => setChoosing(false)}>Resume session</BarButton>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// The pinned bar's frame: one shared shape, so the sheet lines up with the bar under it.
const BAR =
  "fixed inset-x-0 bottom-0 rounded-t-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]";

// Neutral: only the one action that finishes a session is red.
function BarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-14 w-full touch-manipulation rounded-pill bg-page text-lg font-semibold text-ink active:bg-line"
    >
      {children}
    </button>
  );
}
