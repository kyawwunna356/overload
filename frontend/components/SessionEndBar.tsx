"use client";

import { useState } from "react";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { endSession, resumeSession } from "@/lib/writes";

// The optional way to close a session yourself (Hard Rule 2): one tap, no dialog, never
// required — an idle gap closes it anyway. Pinned to the bottom of the summary, in the thumb
// zone but away from the Log button, so a mis-tap here can't log or lose a set. After it ends,
// the same bar turns into the undo: Resume deletes the marker. Only the latest session ever
// gets either control, so a set logged after an End makes Resume disappear by itself.
// It owns its own clock (through useActiveSession), so only this bar repaints each tick.
export function SessionEndBar({ sessionId }: { sessionId: string }) {
  const state = useActiveSession();
  const [failed, setFailed] = useState(false);
  if (!state) return null;

  const { session, last } = state;

  async function run(action: () => Promise<unknown>) {
    setFailed(false);
    try {
      await action();
    } catch {
      setFailed(true);
    }
  }

  let content: React.ReactNode = null;
  if (session?.id === sessionId) {
    content = (
      <BarButton onClick={() => void run(() => endSession(session))}>End session</BarButton>
    );
  } else if (last?.id === sessionId && last.endedManually) {
    content = (
      <>
        <div role="status" className="text-center">
          <p className="text-base font-semibold text-ink">Session ended</p>
          <p className="text-sm text-body">Your next set starts a new session.</p>
        </div>
        <BarButton onClick={() => void run(() => resumeSession(last))}>Resume session</BarButton>
      </>
    );
  }
  if (content === null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 rounded-t-card bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {failed && (
          <p role="alert" className="text-center text-sm font-semibold text-negative-deep">
            Couldn&apos;t save that. Try again.
          </p>
        )}
        {content}
      </div>
    </div>
  );
}

// Neutral, and not red: ending is undoable, and red would frame it as a loss.
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
