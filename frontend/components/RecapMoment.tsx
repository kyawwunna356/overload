"use client";

import { useEffect, useRef, useState } from "react";
import { recapCards, type Recap, type RecapCard } from "@/lib/domain/recap";
import type { SessionSummary } from "@/lib/domain/sessions";
import { formatDuration } from "@/lib/domain/timers";
import { countLabel, formatKg } from "@/lib/format";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { Confetti } from "./Confetti";
import { LevelLine, RecordLine, exerciseNames } from "./SessionRecap";

const PER_CARD = { records: 3, levels: 5 };
const COUNT_UP_MS = 900;

// The moment after Finish: the page dims and a deck of cards pops up in front — the total lifted,
// then your records, then your level-ups, each spread over more cards when the list is long. Swipe
// between them; the deck is native horizontal scrolling that snaps card by card (CSS scroll-snap),
// so there's no gesture code and no dependency. Done, the dimmed page or Escape closes it.
//
// Only Finish opens it, and nothing about it is stored: it's the moment, not a record (the summary
// keeps the recap). A reload or a later visit shows the summary as usual.
export function RecapMoment({
  summary,
  recap,
  dayText,
  onClose,
}: {
  summary: SessionSummary;
  recap: Recap;
  // "Today", "Tuesday" …, already worked out by the summary.
  dayText: string;
  onClose: () => void;
}) {
  const cards = recapCards(recap, PER_CARD);
  const nameOf = exerciseNames(summary);
  const deck = useRef<HTMLDivElement>(null);
  const done = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    done.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    // The page behind stays put while the moment is up.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  function show(index: number) {
    const el = deck.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: index * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Workout done" className="fixed inset-0 z-40 flex flex-col">
      <div
        aria-hidden
        onClick={onClose}
        style={{ touchAction: "none" }}
        className="absolute inset-0 bg-page/85 motion-safe:animate-scrim-in"
      />

      {/* Taps on the empty space around the cards fall through to the dimmed page and close. */}
      <div className="pointer-events-none relative flex flex-1 flex-col justify-center gap-4 pt-[max(1rem,env(safe-area-inset-top))] motion-safe:animate-card-in">
        <div
          ref={deck}
          onScroll={(event) => {
            const el = event.currentTarget;
            setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
          style={{ touchAction: "pan-x" }}
          className="pointer-events-auto mx-auto flex w-full max-w-md snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cards.map((card, index) => (
            <div
              key={index}
              aria-label={`Card ${index + 1} of ${cards.length}`}
              className="w-full shrink-0 snap-center px-4"
            >
              <Card card={card} summary={summary} recap={recap} dayText={dayText} nameOf={nameOf} />
            </div>
          ))}
        </div>

        {cards.length > 1 && (
          <div className="pointer-events-auto mx-auto flex justify-center">
            {cards.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show card ${index + 1} of ${cards.length}`}
                aria-current={index === active}
                onClick={() => show(index)}
                className="touch-manipulation p-2"
              >
                <span
                  className={`block h-2 w-2 rounded-pill transition-colors ${index === active ? "bg-ink" : "bg-line"}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pointer-events-none relative px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          ref={done}
          type="button"
          onClick={onClose}
          className="pointer-events-auto mx-auto block h-14 w-full max-w-md touch-manipulation rounded-pill bg-card text-lg font-semibold text-ink active:bg-line"
        >
          Done
        </button>
      </div>

      {/* One burst as the deck opens, over everything but never in the way of a tap. */}
      <Confetti />
    </div>
  );
}

// One card. Every card sits on the card colour; on the first, the numbers carry the lime.
function Card({
  card,
  summary,
  recap,
  dayText,
  nameOf,
}: {
  card: RecapCard;
  summary: SessionSummary;
  recap: Recap;
  dayText: string;
  nameOf: (id: string) => string;
}) {
  const frame = "flex min-h-[50vh] flex-col rounded-card px-6 py-7 shadow-2xl";

  if (card.kind === "total") {
    return (
      <article className={`${frame} justify-between bg-card`}>
        <div>
          <p className="text-sm font-bold tracking-wide text-body uppercase">Workout done</p>
          <p className="pt-1 font-semibold text-ink">{dayText}</p>
        </div>
        <div>
          <p className="font-display text-6xl font-black leading-none tracking-tight tabular-nums text-primary">
            <RollingKg total={recap.totalKg} />
          </p>
          <p className="pt-2 text-xl font-semibold text-ink">lifted</p>
        </div>
        <p className="font-semibold text-body">
          <GreenNumbers
            text={[
              countLabel(summary.setCount, "set"),
              countLabel(summary.exerciseCount, "exercise"),
              formatDuration(summary.durationMs),
            ].join(" · ")}
          />
        </p>
      </article>
    );
  }

  const heading = card.kind === "records" ? "Records" : "Levels";
  return (
    <article className={`${frame} bg-card`}>
      <p className="flex items-baseline justify-between pb-5">
        <span className="font-display text-3xl font-black tracking-tight text-ink">{heading}</span>
        {card.of > 1 && (
          <span className="text-sm text-body">
            {card.page} of {card.of}
          </span>
        )}
      </p>
      {card.kind === "records" ? (
        <ul className="flex flex-col gap-4">
          {card.prs.map((entry) => (
            <RecordLine key={entry.set.id} entry={entry} name={nameOf(entry.set.exercise_id)} />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-4 text-lg">
          {card.levelUps.map((up) => (
            <LevelLine key={up.exerciseId} up={up} name={nameOf(up.exerciseId)} />
          ))}
        </ul>
      )}
    </article>
  );
}

// The total lifted, rolling up from 0 like a scoreboard as the deck pops in.
function RollingKg({ total }: { total: number }) {
  return <>{formatKg(useCountUp(total, COUNT_UP_MS))}</>;
}

// "23 sets · 6 exercises · 1h 20m" with each number in bold lime and the words left as they are.
function GreenNumbers({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d[\d,.]*)/).map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="font-black tabular-nums text-primary">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
