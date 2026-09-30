import type { BackupState } from './signin';

// First run: what the board says to someone new, and when it offers to install and to back up.
// Value first, account later — the welcome and the hint are derived from what you've done, and the
// two offers wait until you've used the app, then can be put away. Pure: `now` is passed in.

export type FirstRunStage = 'welcome' | 'first-set' | null;

// "welcome" for a brand-new phone (nothing picked, no set ever); "first-set" once you've picked but
// not logged; otherwise nothing. Someone with history but an empty board isn't new, so they get the
// plain "Pick your exercises" card instead.
export function firstRunStage(picked: boolean, hasSets: boolean): FirstRunStage {
  if (hasSets) return null;
  return picked ? 'first-set' : 'welcome';
}

// How long ✕ on the install card puts it away for.
export const INSTALL_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

// The Add to Home Screen card: only in a browser tab (never the installed app), only once you've
// logged a set, and not within a week of the last ✕. `dismissedAt` is null when never dismissed.
export function showInstallCard(
  dismissedAt: number | null,
  now: number,
  standalone: boolean,
  hasSets: boolean,
): boolean {
  if (standalone || !hasSets) return false;
  return dismissedAt === null || now - dismissedAt >= INSTALL_SNOOZE_MS;
}

// The backup prompt: once a session is over, while you're signed out of a configured backup, until
// you say "Not now" (for good — Me always has sign-in). `backup` is null when no backup is set up,
// undefined while it's still being read.
export function showBackupPrompt(
  backup: BackupState | null | undefined,
  finishedSession: boolean,
  dismissed: boolean,
): boolean {
  return backup?.kind === 'signed-out' && finishedSession && !dismissed;
}
