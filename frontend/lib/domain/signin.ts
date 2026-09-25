// The pure parts of signing in and of the backup line. No network here: `lib/sync/auth.ts`
// does the talking.

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

// A sanity check before asking for a code, not validation: the server has the final word.
export function looksLikeEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(input));
}

// Supabase sends 6 to 10 digits depending on the project, so the field keeps digits only (a
// pasted "123 456" still works) and doesn't guess the length.
export const CODE_MIN = 6;
export const CODE_MAX = 10;

export function normalizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, CODE_MAX);
}

export function isCompleteCode(code: string): boolean {
  return code.length >= CODE_MIN;
}

// One phone, one owner: the first account to back up from a phone claims its data, so a friend
// signing in on it can never receive your history. No owner yet means anyone may claim it.
export function canPush(ownerId: string | null, userId: string): boolean {
  return ownerId === null || ownerId === userId;
}

export type BackupState =
  | { kind: 'signed-out' }
  | { kind: 'paused' }
  | { kind: 'backed-up' }
  | { kind: 'waiting'; pending: number };

export function backupState(input: {
  signedIn: boolean;
  pending: number;
  ownerMismatch: boolean;
}): BackupState {
  if (!input.signedIn) return { kind: 'signed-out' };
  if (input.ownerMismatch) return { kind: 'paused' };
  return input.pending === 0 ? { kind: 'backed-up' } : { kind: 'waiting', pending: input.pending };
}

// The board's quiet line. Counts queued changes, not sets: a reorder can queue a few.
export function backupLabel(state: BackupState): string {
  switch (state.kind) {
    case 'signed-out':
      return 'Back up';
    case 'paused':
      return 'Backup paused';
    case 'backed-up':
      return 'Backed up';
    case 'waiting':
      return `${state.pending} ${state.pending === 1 ? 'change' : 'changes'} waiting`;
  }
}
