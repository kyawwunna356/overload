"use client";

import { useEffect } from "react";

// Long enough to notice a mistaken swipe and take it back, short enough to be gone before the
// next set.
const SHOW_MS = 5000;

// "Set deleted · Undo", just above the Log button after a swipe-delete. Swiping is the one quick
// way to lose a set, so it gets a way back. It covers nothing but itself and leaves by itself;
// the deleted set lives only in the caller's state until then — nothing is stored.
export function Snackbar({
  message,
  action,
  onAction,
  onDone,
}: {
  message: string;
  action: string;
  onAction: () => void;
  onDone: () => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return (
    <div
      role="status"
      className="flex min-h-14 items-center justify-between gap-4 rounded-card bg-page pr-2 pl-5 motion-safe:animate-sheet-in"
    >
      <p className="font-semibold text-ink">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="min-h-11 touch-manipulation rounded-pill px-4 font-bold text-primary active:bg-line"
      >
        {action}
      </button>
    </div>
  );
}
