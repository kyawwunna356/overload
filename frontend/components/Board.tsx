"use client";

import Image from "next/image";
import Link from "next/link";
import { firstRunStage, showBackupPrompt, showInstallCard } from "@/lib/domain/firstRun";
import { formatDay } from "@/lib/format";
import { useBackupStatus } from "@/lib/hooks/useBackupStatus";
import { useBoard } from "@/lib/hooks/useBoard";
import { useCoverage } from "@/lib/hooks/useCoverage";
import { useStandalone } from "@/lib/hooks/useDevice";
import { useFirstRun, type FirstRun } from "@/lib/hooks/useFirstRun";
import { useNow } from "@/lib/hooks/useNow";
import { CheckBadge } from "./CheckBadge";
import { AddIcon, CloudIcon } from "./MeScreen";
import { PatternGroup } from "./PatternGroup";
import { WeekStrip } from "./WeekStrip";

// The Train tab: today's date, this week, and your list — the exercises you picked, grouped by
// pattern, in your order. A pattern you haven't picked for isn't shown; with nothing picked at all,
// one card offers to pick. Until the first local read finishes (milliseconds) only the header
// shows — there is no spinner because nothing here waits on the network.
//
// First run (value first, account later): a brand-new phone gets a welcome screen of its own, and
// a hint over the list until the first set — both derived, so they leave by themselves.
// Once you've used the app, two offers wait at the bottom, under your lifts: back up (after a
// session is over, while signed out) and, in a browser tab, add to the Home Screen. Each can be
// put away; neither blocks anything.
export function Board() {
  const now = useNow();
  const groups = useBoard();
  const covered = useCoverage();
  const firstRun = useFirstRun();
  const backup = useBackupStatus();
  const standalone = useStandalone();
  const picked = groups?.filter((group) => group.rows.length > 0);
  const stage = picked && firstRun ? firstRunStage(picked.length > 0, firstRun.hasSets) : undefined;

  // A brand-new phone gets the welcome as a screen of its own (the user's design), until you pick.
  if (stage === "welcome") return <Welcome />;

  return (
    <>
      {/* px-2, like History and Me, so the title doesn't jump sideways when you switch tabs. */}
      <header className="flex items-center justify-between gap-4 px-2 pb-5">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          {formatDay(now)}
        </h1>
        <Link
          href="/exercises"
          // -m-3 p-3 keeps a thumb-sized tap area around a small label, like + New on Edit board.
          className="-m-3 touch-manipulation p-3 text-lg font-semibold text-primary active:text-primary-active"
        >
          Edit
        </Link>
      </header>
      <div className="pb-6">
        <WeekStrip anchor={now} compact />
      </div>
      {picked && picked.length === 0 && stage === null && <EmptyBoard />}
      {picked && picked.length > 0 && (
        <div className="flex flex-col gap-6">
          {stage === "first-set" && (
            <p className="flex h-12 items-center gap-3 rounded-control bg-primary-pale px-4 font-semibold text-primary">
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <path d="m15 6-6 6 6 6" />
              </svg>
              Tap an exercise to log your first set
            </p>
          )}
          {picked.map((group) => (
            <PatternGroup key={group.pattern} group={group} covered={covered?.[group.pattern] ?? false} />
          ))}
        </div>
      )}
      {firstRun && <Offers firstRun={firstRun} now={now} backup={backup} standalone={standalone} />}
    </>
  );
}

// A brand-new phone (the user's design, 1.1): a screen of its own over everything, tab bar
// included — the icon, one promise, three reassurances and one button. No sign-up and no carousel.
// "Restore from backup" is for a friend reinstalling; it goes to Me, where sign-in lives. Derived,
// never stored: it's shown while nothing is picked and nothing was ever logged, so it leaves by
// itself the moment you pick (or a restore brings your list back).
function Welcome() {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-page px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="flex flex-col items-center text-center">
          <Image src="/icons/icon-512.png" alt="" width={100} height={100} unoptimized className="rounded-[1.5rem]" />
          <h1 className="pt-6 font-display text-4xl font-black tracking-tight text-ink">Overload</h1>
          <p className="pt-3 text-body">
            Log a set in one tap.
            <br />
            Remembers what you lifted last time.
          </p>
        </div>
        <ul className="mt-8 flex flex-col gap-4 rounded-card bg-card px-6 py-5">
          {["No account needed", "Works with no signal", "Back up with Google later"].map((line) => (
            <li key={line} className="flex items-center gap-3 text-ink">
              <CheckBadge size="sm" />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
        <Link
          href="/exercises?setup=1"
          className="flex h-14 w-full touch-manipulation items-center justify-center rounded-pill bg-primary text-lg font-semibold text-on-primary active:bg-primary-active"
        >
          Pick your exercises
        </Link>
        <Link
          href="/account"
          className="flex min-h-11 touch-manipulation items-center px-4 text-sm font-semibold text-body active:text-ink"
        >
          Restore from backup
        </Link>
      </div>
    </div>
  );
}

function EmptyBoard() {
  return (
    <section className="rounded-card bg-card px-6 pt-5 pb-3">
      <h2 className="text-xl font-semibold tracking-tight text-ink">Pick your exercises</h2>
      <p className="pt-1 text-body">Choose the lifts you do, and they&apos;ll wait here in your order.</p>
      <Link
        href="/exercises"
        className="mt-4 flex h-12 touch-manipulation items-center justify-center rounded-pill bg-primary text-base font-semibold text-on-primary active:bg-primary-active"
      >
        Pick exercises
      </Link>
    </section>
  );
}

// The two offers under your lifts. What they give you, never what you'd lose.
function Offers({
  firstRun,
  now,
  backup,
  standalone,
}: {
  firstRun: FirstRun;
  now: number;
  backup: ReturnType<typeof useBackupStatus>;
  standalone: boolean;
}) {
  const askBackup = showBackupPrompt(backup, firstRun.finishedSession, firstRun.backupDismissed);
  const askInstall = showInstallCard(firstRun.installDismissedAt, now, standalone, firstRun.hasSets);
  if (!askBackup && !askInstall) return null;

  return (
    <div className="flex flex-col gap-3 pt-8">
      {askBackup && (
        <section className="rounded-card bg-card px-6 pt-5 pb-4">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-page text-primary"
            >
              <CloudIcon />
            </span>
            <div>
              <h2 className="font-semibold text-ink">Back up your training</h2>
              <p className="text-sm text-body">Sign in so a new phone gets every set back.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Link
              href="/account"
              className="flex h-11 flex-1 touch-manipulation items-center justify-center rounded-pill bg-primary font-semibold text-on-primary active:bg-primary-active"
            >
              Back up
            </Link>
            <button
              type="button"
              onClick={firstRun.dismissBackup}
              className="h-11 flex-1 touch-manipulation rounded-pill font-semibold text-body active:bg-line"
            >
              Not now
            </button>
          </div>
        </section>
      )}
      {askInstall && (
        <div className="flex items-center gap-4 rounded-card border border-line py-4 pr-2 pl-6">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-card text-primary"
          >
            <AddIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Add to Home Screen</p>
            <p className="text-sm text-body">Share → Add to Home Screen</p>
          </div>
          <button
            type="button"
            aria-label="Hide for a week"
            onClick={() => firstRun.dismissInstall(now)}
            className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-pill text-xl text-mute active:bg-line"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
