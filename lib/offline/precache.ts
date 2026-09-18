/**
 * Asks the active service worker (public/sw.js) to fetch and store a set of
 * page URLs in its navigation cache, ahead of actually visiting them.
 *
 * This is what makes a setlist available offline the moment it's synced,
 * rather than only after someone has personally opened that exact page
 * while online at least once. Without it, the offline data layer
 * (lib/offline/db.ts) could hold perfectly good data for a setlist whose
 * page shell was never cached — and the service worker would still show
 * the generic offline fallback for it, because the "fetch" handler in
 * sw.js only ever caches a navigation on an actual visit.
 *
 * Best-effort by design: if there's no active service worker yet (e.g.
 * registration is still in flight), or the request fails, callers just
 * fall back to whatever caching already happened normally.
 */
export function precacheUrls(urls: string[]): void {
  if (urls.length === 0) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: "PRECACHE_URLS", urls });
    })
    .catch(() => {
      // No controlling service worker yet — nothing to do.
    });
}
