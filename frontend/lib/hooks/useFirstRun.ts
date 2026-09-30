'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useSyncExternalStore } from 'react';
import { db } from '../db';
import { BACKUP_PROMPT_DISMISSED, FLAG_EVENT, INSTALL_DISMISSED, readFlag, writeFlag } from '../flags';
import { useActiveSession } from './useActiveSession';

export type FirstRun = {
  // Any set was ever logged on this phone.
  hasSets: boolean;
  // At least one session is over (by Finish or the gap), so the app has been used for real.
  finishedSession: boolean;
  // When ✕ last put the install card away, or null.
  installDismissedAt: number | null;
  backupDismissed: boolean;
  dismissInstall: (now: number) => void;
  dismissBackup: () => void;
};

// What the board's first-run bits need, from Dexie (Hard Rule 5) and the two localStorage flags.
// Undefined until the reads finish, which is milliseconds, so the cards never flash in.
//
// "Finished" is derived, never stored: the latest session isn't the active one, or some set was
// logged before the active one began — one indexed read either way.
export function useFirstRun(): FirstRun | undefined {
  const active = useActiveSession();
  const start = active?.session?.started_at ?? null;
  const data = useLiveQuery(async () => {
    const hasSets = (await db.set_logs.limit(1).count()) > 0;
    const earlier = start === null ? undefined : await db.set_logs.where('logged_at').below(start).first();
    return { hasSets, earlier: earlier !== undefined };
  }, [start]);

  const install = useFlag(INSTALL_DISMISSED);
  const backup = useFlag(BACKUP_PROMPT_DISMISSED);

  if (active === undefined || data === undefined || install === undefined || backup === undefined) {
    return undefined;
  }
  const finishedSession = active.session === null ? active.last !== null : data.earlier;
  const installAt = Number(install);

  return {
    hasSets: data.hasSets,
    finishedSession,
    installDismissedAt: install !== null && Number.isFinite(installAt) && installAt > 0 ? installAt : null,
    backupDismissed: backup === '1',
    dismissInstall: (now) => writeFlag(INSTALL_DISMISSED, String(now)),
    dismissBackup: () => writeFlag(BACKUP_PROMPT_DISMISSED, '1'),
  };
}

// One flag, live: re-read when it's written here or in another tab. Undefined on the server
// render, so a card never flashes in before the flag is known.
function useFlag(key: string): string | null | undefined {
  return useSyncExternalStore(subscribeFlags, () => readFlag(key), () => undefined);
}

function subscribeFlags(onChange: () => void): () => void {
  window.addEventListener(FLAG_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(FLAG_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
