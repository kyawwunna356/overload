'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { backupState, canPush, type BackupState } from '../domain/signin';
import { readOwner } from '../sync/owner';
import { useAccount } from './useAccount';

// The backup line's state, derived rather than stored: the outbox's size (live, from Dexie) and
// the saved sign-in. Null when no Supabase project is configured — then there's nothing to back
// up to and the line isn't shown. Undefined until both are known.
export function useBackupStatus(): BackupState | null | undefined {
  const { account, configured } = useAccount();
  const pending = useLiveQuery(() => db.outbox.count(), []);

  if (!configured) return null;
  if (account === undefined || pending === undefined) return undefined;
  return backupState({
    signedIn: account !== null,
    pending,
    ownerMismatch: account !== null && !canPush(readOwner(), account.userId),
  });
}
