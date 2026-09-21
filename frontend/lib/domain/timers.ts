// Both timers are timestamp arithmetic (Hard Rule 4): the session timer is `now − the
// session's first set`, and the rest timer is `now − the last set`. Nothing here counts,
// starts or stops — a caller re-reads the clock and asks again, so the answer is right after
// the phone locks, the tab backgrounds or the app is killed. Pure: `now` is an argument.

// Whole seconds from `since` to `now`, rounded down. Never negative: a timestamp slightly in
// the future (clock skew) reads 0.
export function elapsed(since: number, now: number): number {
  return Math.max(0, Math.floor((now - since) / 1000));
}

// A clock reading for a number of seconds: "0:07", "42:10", and from one hour "1:12:09".
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}

// How long a finished span lasted, for a summary: "under 1 min", "42 min", "1h 07m". Whole
// minutes, rounded down. Unlike the timers this is never counted live: it's the gap between two
// timestamps that already happened.
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return 'under 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}
