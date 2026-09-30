"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { sessionCard, sessionWeeks, type HistoryWeek, type SessionCard } from "@/lib/domain/sessionHistory";
import type { WeekDay } from "@/lib/domain/week";
import { countLabel, formatDay, formatDurationShort, formatTime, patternLabel } from "@/lib/format";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useHistory } from "@/lib/hooks/useHistory";
import { useNow } from "@/lib/hooks/useNow";
import { TrophyIcon } from "./RewardList";

// How many weeks a page adds.
const PAGE_WEEKS = 8;

// Your sessions, newest first, under a heading for each week they happened in: what you did and
// when, nothing to live up to. Each card opens that session's summary, whose ‹ History comes back
// here. Eight weeks at a time; "Show older" adds eight more, and the count lives in `?weeks=`
// (replaced, never pushed) so coming back from a summary finds the same list. A static page that
// reads the local database, so it opens with no signal.
export function HistorySessions() {
  const requested = Number(useSearchParams().get("weeks"));
  const weeks = Number.isInteger(requested) && requested >= PAGE_WEEKS ? requested : PAGE_WEEKS;
  const now = useNow();
  const data = useHistory(weeks, now);
  const activeId = useActiveSession()?.session?.id ?? null;

  const list = useMemo(() => {
    if (data === undefined) return undefined;
    return sessionWeeks(data.sessions, now).map((week) => ({
      week,
      cards: week.sessions.map((session) => sessionCard(session, data.exercises, data.records)),
    }));
  }, [data, now]);

  if (data === undefined || list === undefined) return null;
  if (list.length === 0 && !data.hasOlder) {
    return (
      <p className="rounded-card bg-card px-6 py-5 text-body">
        Your sessions will show up here after your first set.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {list.map(({ week, cards }) => (
        <section key={week.start} aria-label={week.label} className="flex flex-col gap-3">
          <WeekHeading week={week} />
          {cards.map((card) => (
            <SessionCardLink key={card.id} card={card} live={card.id === activeId} />
          ))}
        </section>
      ))}
      {data.hasOlder && (
        <button
          type="button"
          onClick={() => window.history.replaceState(null, "", `/history?weeks=${weeks + PAGE_WEEKS}`)}
          className="mx-auto h-12 touch-manipulation rounded-pill border border-line px-6 font-semibold text-body active:bg-line"
        >
          Show older
        </button>
      )}
    </div>
  );
}

// "This week" with its seven days as bare dots, Monday first (no initials — the user's choice):
// lime where a session started, grey otherwise, faint for the days still to come. No count and no
// target — a day off is just a day.
function WeekHeading({ week }: { week: HistoryWeek }) {
  return (
    <div className="flex items-center justify-between gap-4 px-2">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{week.label}</h2>
      <ol aria-label="Days trained" className="flex gap-1.5">
        {week.days.map((day) => (
          <li
            key={day.key}
            aria-label={`${day.name} ${day.date}${day.trained ? ", trained" : ""}`}
            className={`h-2 w-2 rounded-pill ${dotStyle(day)}`}
          />
        ))}
      </ol>
    </div>
  );
}

function dotStyle(day: WeekDay): string {
  if (day.trained) return "bg-primary";
  return day.future ? "bg-line/50" : "bg-line";
}

// One session in two quiet lines: when it started ("Wed 30 Sep · 07:12"), then how long, how many
// exercises and sets ("58m · 5 exercises · 15 sets"), then the patterns it touched as lime chips and
// the records it broke — the user's mock-up. A › says it opens the summary. The session still going
// says Now in place of a length, which is still counting on the live bar.
function SessionCardLink({ card, live }: { card: SessionCard; live: boolean }) {
  const facts = [
    live ? null : formatDurationShort(card.durationMs),
    countLabel(card.exercises, "exercise"),
    countLabel(card.sets, "set"),
  ].filter((part) => part !== null);
  return (
    <Link
      href={`/session?id=${encodeURIComponent(card.id)}`}
      className="flex touch-manipulation items-start gap-3 rounded-card bg-card py-4 pr-4 pl-5 active:bg-line"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-lg font-semibold tabular-nums text-ink">
            {formatDay(card.started_at)} · {formatTime(card.started_at)}
          </span>
          {live && (
            <span className="rounded-pill bg-primary-pale px-2.5 py-0.5 text-xs font-bold text-primary">Now</span>
          )}
        </span>
        <span className="block pt-1 text-sm tabular-nums text-body">{facts.join(" · ")}</span>
        {(card.patterns.length > 0 || card.records > 0) && (
          <span className="flex flex-wrap items-center gap-1.5 pt-2.5">
            {card.patterns.map((pattern) => (
              <span
                key={pattern}
                className="rounded-pill bg-primary-pale px-3 py-1 text-[13px] font-semibold text-primary"
              >
                {patternLabel(pattern)}
              </span>
            ))}
            {card.records > 0 && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-record-pale px-3 py-1 text-[13px] font-semibold text-record [&_svg]:h-3.5 [&_svg]:w-3.5">
                <TrophyIcon />
                <span className="sr-only">Records:</span>
                {card.records}
              </span>
            )}
          </span>
        )}
      </span>
      {/* Level with the date line, as in the mock-up. */}
      <span aria-hidden className="shrink-0 pt-0.5 text-2xl leading-none text-mute">
        ›
      </span>
    </Link>
  );
}
