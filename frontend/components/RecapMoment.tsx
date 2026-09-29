"use client";

import { useEffect, useRef, useState } from "react";
import { muscleBalance, topMuscle, type MuscleBalance } from "@/lib/domain/muscles";
import { sessionStats, type Recap } from "@/lib/domain/recap";
import type { SessionSummary } from "@/lib/domain/sessions";
import { countLabel, formatLongDay, formatOrdinal, formatSpan, formatWhole } from "@/lib/format";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { useSessionNumber } from "@/lib/hooks/useSessionNumber";
import { Confetti } from "./Confetti";
import { MuscleStar } from "./MuscleStar";
import { exerciseNames, hasRewards, RewardList, StarIcon, TrophyIcon } from "./RewardList";
import { durationText, StatRow } from "./StatRow";
import { WeekStrip } from "./WeekStrip";

const COUNT_UP_MS = 900;

type DeckCard = "done" | "rewards" | "muscles";

// The moment after Finish: a full screen of cards you swipe through — the session done (its stats,
// what it earned in two chips, and its week), then the rewards, then the muscle star. A
// card with nothing to show isn't dealt, so a quiet session is one card. Swiping is native
// horizontal scrolling that snaps card by card (CSS scroll-snap), so there's no gesture code. The
// lime button says Next, and Done on the last card; Done (or Escape) leaves you on the summary,
// which sits under the History tab.
//
// Only Finish opens it, and nothing about it is stored: it's the moment, not a record (the summary
// keeps the rewards). A reload or a later visit shows the summary as usual.
export function RecapMoment({
  summary,
  recap,
  onClose,
}: {
  summary: SessionSummary;
  recap: Recap;
  onClose: () => void;
}) {
  const balance = muscleBalance(summary.groups);
  const cards: DeckCard[] = [
    "done",
    ...(hasRewards(recap) ? (["rewards"] as const) : []),
    ...(topMuscle(balance) !== null ? (["muscles"] as const) : []),
  ];
  const deck = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);
  const last = active >= cards.length - 1;

  useEffect(() => {
    button.current?.focus();
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Session done"
      className="fixed inset-0 z-40 flex flex-col bg-page motion-safe:animate-scrim-in"
    >
      <div
        ref={deck}
        onScroll={(event) => {
          const el = event.currentTarget;
          setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        style={{ touchAction: "pan-x pan-y" }}
        className="mx-auto flex w-full max-w-md flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain pt-[max(1.5rem,env(safe-area-inset-top))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, index) => (
          <section
            key={card}
            aria-label={`Card ${index + 1} of ${cards.length}`}
            className="flex w-full shrink-0 snap-center flex-col justify-center overflow-y-auto px-4 pb-4"
          >
            {card === "done" && <DoneCard summary={summary} recap={recap} />}
            {card === "rewards" && (
              <>
                <h2 className="px-2 pb-4 font-display text-3xl font-black tracking-tight text-ink">Rewards</h2>
                <RewardList recap={recap} summary={summary} />
              </>
            )}
            {card === "muscles" && <MusclesDeckCard balance={balance} />}
          </section>
        ))}
      </div>

      <div className="mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {cards.length > 1 && (
          <div className="flex justify-center pb-3">
            {cards.map((card, index) => (
              <button
                key={card}
                type="button"
                aria-label={`Show card ${index + 1} of ${cards.length}`}
                aria-current={index === active}
                onClick={() => show(index)}
                className="touch-manipulation p-1.5"
              >
                <span
                  className={`block h-2 w-2 rounded-pill transition-colors ${index === active ? "bg-primary" : "bg-line"}`}
                />
              </button>
            ))}
          </div>
        )}
        <button
          ref={button}
          type="button"
          onClick={() => (last ? onClose() : show(active + 1))}
          className="h-14 w-full touch-manipulation rounded-pill bg-primary text-lg font-semibold text-on-primary active:bg-primary-active"
        >
          {last ? "Done" : "Next"}
        </button>
      </div>

      {/* One burst as the deck opens, over everything but never in the way of a tap. */}
      <Confetti />
    </div>
  );
}

// The first card: the session done, its numbers, what it earned, and where it sits in the week.
function DoneCard({ summary, recap }: { summary: SessionSummary; recap: Recap }) {
  const stats = sessionStats(summary);
  const number = useSessionNumber(summary.session);
  const nameOf = exerciseNames(summary);
  const { session } = summary;
  const levelChip =
    recap.levelUps.length === 1
      ? `${nameOf(recap.levelUps[0].exerciseId)} → Level ${recap.levelUps[0].level}`
      : `${recap.levelUps.length} level-ups`;

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-bold tracking-wider text-primary uppercase">Session done</p>
      <h2 className="pt-1 font-display text-3xl font-black tracking-tight text-ink">
        {formatLongDay(session.started_at, session.started_at)}
      </h2>
      <p className="pt-1 text-sm tabular-nums text-body">
        {formatSpan(session.started_at, session.ended_at ?? session.last_set_at)}
      </p>

      <div className="w-full pt-6">
        <StatRow duration={durationText(stats.durationMs)} sets={stats.sets} kg={<RollingKg total={stats.kg} />} />
      </div>

      {hasRewards(recap) && (
        <div className="flex flex-wrap justify-center gap-2 pt-5">
          {recap.prs.length > 0 && (
            <Chip tint="bg-record-pale text-record" icon={<TrophyIcon />}>
              {countLabel(recap.prs.length, "record")}
            </Chip>
          )}
          {recap.levelUps.length > 0 && (
            <Chip tint="bg-level-pale text-level" icon={<StarIcon />}>
              {levelChip}
            </Chip>
          )}
        </div>
      )}

      {number !== undefined && (
        <p className="pt-7 pb-2 text-sm font-semibold text-body">{formatOrdinal(number)} session this week</p>
      )}
      <div className="w-full">
        <WeekStrip anchor={session.started_at} sessionId={session.id} markAnchor />
      </div>
    </div>
  );
}

function Chip({ tint, icon, children }: { tint: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={`inline-flex h-10 items-center gap-2 rounded-pill px-4 text-sm font-semibold ${tint}`}>
      <span aria-hidden className="[&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      {children}
    </span>
  );
}

// The last card: the session's shape, the star at full size on its own.
function MusclesDeckCard({ balance }: { balance: MuscleBalance }) {
  return (
    <>
      <h2 className="px-2 font-display text-3xl font-black tracking-tight text-ink">Muscles</h2>
      <div className="mx-auto w-full max-w-[19rem] pt-6">
        <MuscleStar balance={balance} />
      </div>
    </>
  );
}

// The kg lifted, rolling up from 0 like a scoreboard as the deck appears.
function RollingKg({ total }: { total: number }) {
  return <>{formatWhole(useCountUp(total, COUNT_UP_MS))}</>;
}
