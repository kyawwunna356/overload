"use client";

import type { ReactNode } from "react";
import { openSheet } from "@/lib/sheets";

// A link to one exercise's log sheet. A plain tap opens the sheet over the page you're on, so you
// come back to exactly where you were; the href is the full-page log sheet, for a long-press,
// a modified click, or anything that can't run the tap handler.
export function LogLink({
  exerciseId,
  className,
  children,
}: {
  exerciseId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`/exercise?id=${encodeURIComponent(exerciseId)}`}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        openSheet("log", exerciseId);
      }}
      className={className}
    >
      {children}
    </a>
  );
}
