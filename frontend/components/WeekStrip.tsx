"use client";

import type { WeekDay } from "@/lib/domain/week";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useWeek } from "@/lib/hooks/useWeek";

// A week, Monday to Sunday: the one a session belongs to on its summary, or this week on the board
// (`anchor` is now and there's no `sessionId`). A day you trained is green. While a session is
// still going — that session, or on the board any session — its day is a green outline, in
// progress; once it's over (Finish, or the 90-minute gap) that day fills in like any other. A day
// off is a plain grey number — no cross, no count, no target — because the week is something to
// look at, never something to fall short of.
//
// "Still going" comes from useActiveSession, the live clock the End bar and the recap use, so the
// outline fills the instant the session ends.
//
// `markAnchor` rings the session's own day even after it's over, for the finish deck, where the
// strip says "this is the day you just trained".
export function WeekStrip({
  anchor,
  sessionId,
  markAnchor = false,
}: {
  anchor: number;
  sessionId?: string;
  markAnchor?: boolean;
}) {
  const week = useWeek(anchor);
  const running = useActiveSession()?.session ?? null;
  const live = markAnchor || (running !== null && (sessionId === undefined || running.id === sessionId));
  if (week === undefined) return null;

  return (
    <ol
      aria-label={sessionId === undefined ? "This week" : "This session's week"}
      className="grid grid-cols-7 gap-1 rounded-card bg-card px-3 py-4"
    >
      {week.map((day) => (
        <li
          key={day.key}
          aria-label={`${day.name} ${day.date}${day.trained ? ", trained" : ""}${day.anchor ? (sessionId === undefined ? ", today" : ", this session") : ""}`}
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
