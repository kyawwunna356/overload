"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PR } from "@/lib/domain/prs";
import type { SetLog } from "@/lib/domain/types";
import { RecordChange } from "./RecordChange";

// Long enough to read one line, short enough to be gone before the next set.
const SHOW_MS = 3000;

// The record moment: a yellow toast that drops in at the top of the screen and leaves by itself.
// It floats over everything (portaled to body, so the sheet's layout never shifts) and never dims
// the page or catches taps (pointer-events: none), so the Log button
// works the whole time — rewards never block (CLAUDE.md). The set keeps its PR pill in the table;
// nothing about the banner is stored. Screen readers hear it through the status role.
export function RecordBanner({
  set,
  prs,
  onDone,
}: {
  set: Pick<SetLog, "weight" | "reps">;
  prs: readonly PR[];
  onDone: () => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return createPortal(
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-40 mx-auto flex max-w-md items-center gap-4 rounded-card border border-record bg-record-pale px-5 py-4 text-record shadow-[0_8px_32px_rgb(0_0_0/0.5)] motion-safe:animate-drop-in"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      </svg>
      <p className="min-w-0">
        <span className="block pb-0.5 font-display text-lg font-black text-ink">New record</span>
        <RecordChange set={set} prs={prs} />
      </p>
    </div>,
    document.body,
  );
}
