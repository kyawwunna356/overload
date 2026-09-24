"use client";

import { useEffect } from "react";
import type { PR } from "@/lib/domain/prs";
import { prKindLabel, prValues } from "@/lib/format";

// Long enough to read two lines between sets, short enough to be gone before the next one.
const SHOW_MS = 4000;

// The reward for a record: shown the moment the set is logged, just above the Log button where
// your eyes already are. It's anchored above the pinned bar, so the button never moves under a
// thumb. It asks nothing of you: it goes by itself, or on a tap. Nothing about it is stored; the
// lasting mark is the history's job.
export function PRFlash({ prs, onDone }: { prs: PR[]; onDone: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return (
    <button
      type="button"
      onClick={onDone}
      className="absolute inset-x-0 bottom-full mb-3 block touch-manipulation rounded-card bg-primary px-6 py-4 text-left text-on-primary shadow-2xl motion-safe:animate-sheet-in"
    >
      <span className="block font-display text-2xl font-black">New record</span>
      {prs.map((pr) => (
        <span key={pr.kind} className="flex items-baseline justify-between gap-3 pt-1">
          <span className="font-semibold">{prKindLabel(pr.kind)}</span>
          <span className="shrink-0 tabular-nums">{prValues(pr)}</span>
        </span>
      ))}
    </button>
  );
}
