'use client';

// Sheets live in the URL: `?log=<exercise id>`, `?live` (and, in a later ticket, `?edit=…`) on
// whatever page you're on. Opening one pushes a history entry with the same path and the sheet's
// param, so the page underneath never changes — the board keeps its scroll position — and the
// browser's back closes the sheet. A reload reopens it offline, because the service worker
// ignores the query on navigations. This is the pushState pattern the bundled Next docs describe;
// the router keeps useSearchParams in step with it.

export type SheetName = 'log' | 'live';

const SHEET_PARAMS: readonly SheetName[] = ['log', 'live'];

// Whether the open sheet was pushed from this tab. If it was, closing goes back one entry, so
// back and close agree; if the page was opened straight onto a sheet (a reload, a shared link),
// there's nothing of ours to go back to, and closing just drops the param.
let pushed = false;
let listening = false;

export function openSheet(name: SheetName, value: string): void {
  if (!listening) {
    listening = true;
    window.addEventListener('popstate', () => {
      pushed = false;
    });
  }
  window.history.pushState(null, '', urlWith(name, value));
  pushed = true;
}

// Swaps what the open sheet shows (the live screen's exercises) without a new history entry, so back still returns to
// the page underneath rather than to the previous exercise.
export function replaceSheet(name: SheetName, value: string): void {
  window.history.replaceState(null, '', urlWith(name, value));
}

// For leaving a sheet by navigating to another page with router.replace (Finish lands on the
// summary): that replaces the sheet's own history entry, so there's nothing left for a later close
// to go back over.
export function forgetSheet(): void {
  pushed = false;
}

export function closeSheet(): void {
  if (pushed) {
    pushed = false;
    window.history.back();
    return;
  }
  window.history.replaceState(null, '', urlWith(null, null));
}

// The current path and query, with every sheet param removed and then, optionally, one set.
function urlWith(name: SheetName | null, value: string | null): string {
  const url = new URL(window.location.href);
  for (const param of SHEET_PARAMS) url.searchParams.delete(param);
  if (name !== null && value !== null) url.searchParams.set(name, value);
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
}
