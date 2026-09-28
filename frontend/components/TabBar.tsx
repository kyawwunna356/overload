"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useBackupStatus } from "@/lib/hooks/useBackupStatus";

// The three places the app has: Train (the board), History and Me. Pinned in the bottom third
// for the thumb, one tap to any of them. Plain links, so each tab is prefetched and opens with
// no signal. It shows only on the three tab pages; the log sheet, the picker and the session
// summary keep their own pinned buttons until they become sheets.
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

  if (!TABS.some((tab) => tab.href === path)) return null;

  return (
    <>
      {/* Holds the bar's height in the page, so the last content scrolls clear of it. */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))]" />
      <nav
        aria-label="Tabs"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-page pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map((tab) => {
            const active = tab.href === path;
            const badge = tab.href === "/account" && backup?.kind === "paused";
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-[4.5rem] touch-manipulation flex-col items-center justify-center gap-1 text-xs font-semibold ${
                    active ? "text-primary" : "text-mute active:text-ink"
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
