import { liveQuery } from 'dexie';
import { db } from '../db';
import { onAuthChange } from './auth';
import { flushOutbox } from './push';

// When the outbox drains: on open, when the phone comes back online, when you return to the app,
// when you sign in, and a few seconds after a new write (so with signal a set is backed up almost
// at once, and a burst of sets goes up together). All fire-and-forget; `flushOutbox` is
// single-flight, so overlapping triggers cost nothing.

const AFTER_WRITE_MS = 3000;

export function startSync(): () => void {
  const flush = () => {
    void flushOutbox();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') flush();
  };

  flush();
  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', onVisible);

  let debounce: ReturnType<typeof setTimeout> | undefined;
  let lastCount: number | undefined;
  const writes = liveQuery(() => db.outbox.count()).subscribe({
    next: (count) => {
      if (lastCount !== undefined && count > lastCount) {
        clearTimeout(debounce);
        debounce = setTimeout(flush, AFTER_WRITE_MS);
      }
      lastCount = count;
    },
  });

  const stopAuth = onAuthChange((account) => {
    if (account) flush();
  });

  return () => {
    window.removeEventListener('online', flush);
    document.removeEventListener('visibilitychange', onVisible);
    clearTimeout(debounce);
    writes.unsubscribe();
    stopAuth();
  };
}
