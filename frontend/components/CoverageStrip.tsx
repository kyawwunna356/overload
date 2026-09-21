"use client";

import { PATTERNS } from "@/lib/domain/types";
import { patternLabel } from "@/lib/format";
import { useCoverage } from "@/lib/hooks/useCoverage";

// Which movement patterns the current session has touched: `Squat ✓ Hinge ✓ Push`. It's
// information, never a target: nothing here is tappable, counts anything or compares against a
// plan, and an untouched pattern is just its name in quiet grey, with no mark and no warning, so
// it can't be failed.
// It shows only while a session is active — the first set opens it, like the timers.
export function CoverageStrip() {
  const covered = useCoverage();
  if (!covered) return null;

  return (
    <ul aria-label="Patterns covered this session" className="flex flex-wrap gap-2 pb-6">
      {PATTERNS.map((pattern) => {
        const done = covered[pattern];
        return (
          <li
            key={pattern}
            aria-label={`${patternLabel(pattern)} ${done ? "covered" : "not yet"}`}
            className={`inline-flex h-8 items-center rounded-pill px-3 text-sm font-semibold ${
              done ? "bg-primary-pale text-ink-deep" : "bg-card text-body"
            }`}
          >
            {patternLabel(pattern)}
            {done && " ✓"}
          </li>
        );
      })}
    </ul>
  );
}
