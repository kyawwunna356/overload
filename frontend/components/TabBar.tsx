"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { elapsed, formatElapsed } from "@/lib/domain/timers";
import { countLabel } from "@/lib/format";
import { useActiveSession } from "@/lib/hooks/useActiveSession";
import { useBackupStatus } from "@/lib/hooks/useBackupStatus";
import { openSheet } from "@/lib/sheets";

// The three places the app has: Train (the board), History and Me. Pinned in the bottom third
// for the thumb, one tap to any of them. Plain links, so each tab is prefetched and opens with
// no signal. It shows only on the three tab pages; the log sheet, the picker and the session
// summary keep their own pinned buttons until they become sheets.
//
// Above the tabs, only while a session is running, sits the live bar: proof something is running
// and one tap to it (the live screen, where End lives). It never appears before a set, so there's
// still no Start button (Hard Rule 2). A sheet covers it, so the log sheet's rest timer is the only
// big counter while you log.
//
// A dot on Me appears only when backup is paused — the one backup state that needs you to act.
// "Changes waiting" is normal in a basement gym and never badges.

type Tab = { href: string; label: string; icon: ReactNode };

const TABS: readonly Tab[] = [
  { href: "/", label: "Train", icon: <TrainIcon /> },
  { href: "/history", label: "History", icon: <HistoryIcon /> },
  { href: "/account", label: "Me", icon: <MeIcon /> },
];

export function TabBar() {
  const path = normalize(usePathname());
  const backup = useBackupStatus();
  const active = useActiveSession();

  if (!TABS.some((tab) => tab.href === path)) return null;
  const session = active?.session ?? null;

  return (
    <>
      {/* Holds the bars' height in the page, so the last content scrolls clear of them. */}
      <div
        aria-hidden
        className={
          session
            ? "h-[calc(9rem+env(safe-area-inset-bottom))]"
            : "h-[calc(4.5rem+env(safe-area-inset-bottom))]"
        }
      />
      <div className="fixed inset-x-0 bottom-0 z-10">
        {session && active && (
          <div className="mx-auto max-w-md px-4 pb-2">
            <button
              type="button"
              onClick={() => openSheet("live", "1")}
              aria-label="Open the live session"
              className="flex h-16 w-full touch-manipulation items-center gap-4 rounded-card bg-raised px-5 text-left shadow-[0_-4px_24px_rgb(0_0_0/0.5)] ring-1 ring-primary/30 active:bg-line"
            >
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-pill bg-primary motion-safe:animate-pulse" />
              <span className="min-w-0 flex-1 tabular-nums">
                <span className="block text-lg font-bold leading-tight text-ink">
                  Rest {formatElapsed(elapsed(session.last_set_at, active.now))}
                </span>
                <span className="block text-sm text-body">
                  Session {formatElapsed(elapsed(session.started_at, active.now))} ·{" "}
                  {countLabel(session.sets.length, "set")}
                </span>
              </span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-body" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 15 6-6 6 6" />
              </svg>
            </button>
          </div>
        )}
        <nav
          aria-label="Tabs"
          className="border-t border-line bg-page pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="mx-auto flex max-w-md">
            {TABS.map((tab) => {
              const current = tab.href === path;
              const badge = tab.href === "/account" && backup?.kind === "paused";
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex h-[4.5rem] touch-manipulation flex-col items-center justify-center gap-1 text-xs font-semibold ${
                      current ? "text-primary" : "text-mute active:text-ink"
                    }`}
                  >
                    <span className="relative">
                      {tab.icon}
                      {badge && (
                        <span className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-pill bg-negative-deep">
                          <span className="sr-only">Backup paused</span>
                        </span>
                      )}
                    </span>
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}

// The static export may serve "/account/" as well as "/account".
function normalize(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

// Icons are drawn inline in currentColor, so the tab's text colour tints them and no request
// is needed offline.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function TrainIcon() {
  return (
    <Icon>
      <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
    </Icon>
  );
}

function HistoryIcon() {
  return (
    <Icon>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
      <path d="M3.5 4v4h4" />
      <path d="M12 8v4.5l3 1.5" />
    </Icon>
  );
}

function MeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}
