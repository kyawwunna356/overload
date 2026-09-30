// The first-run offers' two dismissals, remembered on this device. They record a choice you made
// ("not now"), not training data, so they live in localStorage beside the auth session rather than
// in Dexie, and are never synced. Storage can throw (private mode): then a dismissal just isn't
// remembered, and the card comes back next time.

export const INSTALL_DISMISSED = 'overload.installDismissed';
export const BACKUP_PROMPT_DISMISSED = 'overload.backupPromptDismissed';

export function readFlag(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Tells readers on this page that a flag changed; the `storage` event only reaches other tabs.
export const FLAG_EVENT = 'overload-flag';

export function writeFlag(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: see above.
  }
  window.dispatchEvent(new Event(FLAG_EVENT));
}
