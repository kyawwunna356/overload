// Overload's service worker: keeps the whole app on the phone so it opens with no signal
// (Ticket 38). Generated into out/sw.js by scripts/build-sw.mjs, which fills in VERSION and FILES
// from the exported site — edit this template, never out/sw.js.
//
// It serves files only. Every read still comes from IndexedDB (Hard Rule 5), and requests to other
// origins (Supabase, Google) are never touched. There is no push handler: no notifications, ever.

const VERSION = '__VERSION__';
const FILES = __FILES__;
const PAGES = __PAGES__;

const PREFIX = 'overload-';
const CURRENT = PREFIX + VERSION;

// Precache every file of this version. Fetched fresh (no HTTP cache), and a redirected response is
// rebuilt as a plain one: iOS refuses to show a page a service worker answered with a redirect.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CURRENT);
      for (const url of FILES) {
        const response = await fetch(url, { cache: 'reload' });
        if (!response.ok) throw new Error(`precache failed: ${url} ${response.status}`);
        const clean = response.redirected
          ? new Response(await response.blob(), { status: 200, headers: response.headers })
          : response;
        await cache.put(url, clean);
      }
      await self.skipWaiting();
    })(),
  );
});

// Keep this version and the one before it — a screen opened under the old version may still ask
// for one of its files — and delete anything older.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const ours = (await caches.keys()).filter((key) => key.startsWith(PREFIX) && key !== CURRENT);
      const previous = ours.at(-1);
      await Promise.all(ours.filter((key) => key !== previous).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? page(url) : file(request));
});

// A screen, whatever its query (/exercise?id=…, /account?code=…): the cached HTML for its path.
// An unknown path is tried on the network, then falls back to the board.
async function page(url) {
  const path = url.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  const cache = await caches.open(CURRENT);
  if (PAGES.includes(path)) {
    const hit = await cache.match(path);
    if (hit) return hit;
  }
  try {
    return await fetch(url);
  } catch {
    return (await cache.match('/')) ?? Response.error();
  }
}

// Scripts, styles, fonts and the payloads Next fetches to change screens: this version's copy
// first, then an older version's, then the network. The query (?_rsc=…) never matters here.
async function file(request) {
  const cache = await caches.open(CURRENT);
  const hit =
    (await cache.match(request, { ignoreSearch: true })) ??
    (await caches.match(request, { ignoreSearch: true }));
  return hit ?? fetch(request);
}
