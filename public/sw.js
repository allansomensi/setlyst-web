/**
 * Setlyst service worker.
 *
 * Goal: let a page you've already opened at least once while online keep
 * working with no signal — this matters most for the Live Mode screen,
 * which musicians open at a venue that may have bad or no connectivity.
 *
 * Strategy:
 *  - Full page navigations (a real browser load of a URL, not a client-side
 *    transition): network-first. On success the response is cached; on
 *    failure (offline) the last cached copy for that exact URL is served,
 *    falling back to a generic offline page if nothing was ever cached.
 *  - Next.js build assets under /_next/static/: cache-first. Their
 *    filenames are content-hashed, so a cached copy is always valid.
 *  - Any other same-origin GET (images, fonts, etc.): stale-while-revalidate.
 *
 * Deliberately NOT cached: non-GET requests (mutations) and cross-origin
 * requests (the API server). Losing network never silently serves a stale
 * mutation result or a stale API response — only already-rendered pages
 * and static assets are replayed offline.
 */

const CACHE_VERSION = "setlyst-v1";
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .catch(() => {
        // Precaching the offline fallback is best-effort; a fetch-time
        // failure here must never block the service worker from installing.
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Offline</title>" +
        "<p>Você está offline e esta página ainda não foi salva.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 },
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await networkPromise) || Response.error();
}
