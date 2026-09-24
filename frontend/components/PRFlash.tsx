"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PR } from "@/lib/domain/prs";
import { prAmount, prKindLabel } from "@/lib/format";

// Long enough to read two lines between sets, short enough to be gone before the next one.
const SHOW_MS = 4000;

// The reward for a record: shown the moment the set is logged, dropping in at the top of the
// screen while the page behind dims. It asks nothing of you: it goes by itself, or on a tap
// anywhere. Nothing about it is stored; the lasting mark is the history's job.
//
// Portalled to <body>, so the dimming covers the whole screen rather than only the pinned bar
// the flash is rendered from.
export function PRFlash({ prs, onDone }: { prs: PR[]; onDone: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return createPortal(
    <div className="fixed inset-0 z-40" onClick={onDone}>
      <div aria-hidden className="absolute inset-0 bg-page/70 motion-safe:animate-scrim-in" />
      <div className="relative mx-auto max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          // A dark yellow tint with bright yellow on what's new; the beaten value sits small and
          // grey before it, so the eye lands on the new number first.
          className="block w-full touch-manipulation rounded-card bg-record-pale px-6 py-4 text-left text-ink shadow-2xl ring-1 ring-record/30 motion-safe:animate-drop-in"
        >
          <span className="block font-display text-2xl font-black text-record">New record</span>
          {prs.map((pr) => (
            <span key={pr.kind} className="flex items-baseline justify-between gap-3 pt-2">
              <span className="text-sm font-semibold text-body">{prKindLabel(pr.kind)}</span>
              <span className="shrink-0 tabular-nums">
                <span className="text-sm text-mute">{prAmount(pr, pr.previous)} → </span>
                <span className="text-xl font-black text-record">{prAmount(pr, pr.value)}</span>
              </span>
            </span>
          ))}
        </button>
      </div>
    </div>,
    document.body,
  );
}
