"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Mastery } from "@/lib/domain/mastery";
import { masteryLine } from "@/lib/format";

// "Level 3", tappable: a tap shows a small label with the sessions behind it and how many more
// reach the next level, and a tap anywhere hides it. Kept out of the header by default so the
// top of the log sheet stays uncluttered mid-set.
export function LevelBadge({ mastery }: { mastery: Mastery }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <span ref={root} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((shown) => !shown)}
        className="-my-2 touch-manipulation py-2 font-semibold text-ink underline decoration-body decoration-dotted underline-offset-4"
      >
        Level {mastery.level}
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-2 whitespace-nowrap rounded-control bg-line px-3 py-1.5 text-sm text-ink shadow-2xl motion-safe:animate-scrim-in"
        >
          {masteryLine(mastery)}
        </span>
      )}
    </span>
  );
}
