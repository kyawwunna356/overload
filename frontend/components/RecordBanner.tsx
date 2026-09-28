"use client";

import { useEffect } from "react";

// Long enough to read one line, short enough to be gone before the next set.
const SHOW_MS = 3000;

// The record moment: a yellow line that slides in under the log sheet's header and leaves by
// itself. It never dims the page and catches no taps (pointer-events: none), so the Log button
// works the whole time — rewards never block (CLAUDE.md). The set keeps its PR pill in the table;
// nothing about the banner is stored. Screen readers hear it through the status role.
export function RecordBanner({ line, onDone }: { line: string; onDone: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return (
    <div
      role="status"
      className="pointer-events-none flex items-center gap-3 rounded-card border border-record bg-record-pale px-5 py-4 text-record motion-safe:animate-drop-in"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      </svg>
      <p className="font-semibold tabular-nums">{line}</p>
    </div>
  );
}
