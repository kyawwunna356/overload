// Which account this phone's data belongs to: the first one to back up from it. Kept so a friend
// signing in on your phone can never receive your history (see `canPush`). This is sync
// bookkeeping about the device, not training data, so it lives beside the auth session in
// localStorage rather than in Dexie. Storage can throw (private mode): then there's no owner,
// which only means the next account to back up claims the phone.

const KEY = 'overload.owner';

export function readOwner(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function claimOwner(userId: string): void {
  try {
    window.localStorage.setItem(KEY, userId);
  } catch {
    // Nothing to do: without storage the guard can't hold, and backup still works.
  }
}
