"use client";

import type { WeekDay } from "@/lib/domain/week";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useWeek } from "@/lib/hooks/useWeek";

// The week this session belongs to, Monday to Sunday. A day you trained is green. While the
// session is still going, its own day is a green outline — in progress; once it's over (Finish,
// or the 90-minute gap) that day fills in like any other. A day off is a plain grey number — no
// cross, no count, no target — because the week is something to look at, never something to fall
// short of.
//
// "Still going" comes from useActiveSession, the live clock the End bar and the recap use, so the
// outline fills the instant the session ends.
export function WeekStrip({ anchor, sessionId }: { anchor: number; sessionId: string }) {
  const week = useWeek(anchor);
  const live = useActiveSession()?.session?.id === sessionId;
  if (week === undefined) return null;

  return (
    <ol aria-label="This session's week" className="grid grid-cols-7 gap-1 rounded-card bg-card px-3 py-4">
      {week.map((day) => (
        <li
          key={day.key}
          aria-label={`${day.name} ${day.date}${day.trained ? ", trained" : ""}${day.anchor ? ", this session" : ""}`}
          className="flex flex-col items-center gap-2"
        >
          <span aria-hidden className="text-xs font-semibold text-body">
            {day.initial}
          </span>
          <span
            aria-hidden
            className={`flex h-10 w-10 items-center justify-center rounded-pill text-base font-bold tabular-nums ${dayStyle(day, live)}`}
          >
            {day.date}
          </span>
        </li>
      ))}
    </ol>
  );
}

// The live session's day is an outline in the same green, so it reads as "still going" without
// competing with the filled days around it.
function dayStyle(day: WeekDay, live: boolean): string {
  if (day.anchor && live) return "ring-2 ring-inset ring-primary text-ink";
  if (day.trained) return "bg-primary text-on-primary";
  return day.future ? "text-mute" : "text-body";
}
