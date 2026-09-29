import { isServiceWorkerEnabled } from "./sw-enabled";

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
 * The list goes over in small batches, each acknowledged by the worker
 * before the next is sent: a sync can ask for hundreds of pages, and one
 * message carrying them all kept a single service-worker event alive for
 * the whole crawl — long enough for the browser to kill the worker
 * mid-way (Chromium stops an event after five minutes), silently, with
 * nothing to resume it. A batch that gets no answer in a reasonable time
 * ends the run rather than waiting forever.
 *
 * Best-effort by design: if there's no active service worker yet (e.g.
 * registration is still in flight), or the request fails, callers just
 * fall back to whatever caching already happened normally.
 */
const BATCH_SIZE = 12;
/** Two server renders at a time in the worker: a batch is a dozen of them. */
const BATCH_TIMEOUT_MS = 3 * 60 * 1000;

function sendBatch(worker: ServiceWorker, urls: string[]): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve();
    }, BATCH_TIMEOUT_MS);
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      channel.port1.close();
      resolve();
    };
    try {
      worker.postMessage({ type: "PRECACHE_URLS", urls }, [channel.port2]);
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

/**
 * Hands `urls` to the service worker in batches. Resolves once every batch
 * was acknowledged (or gave up), reporting how many URLs have been handed
 * over so far; never rejects.
 */
export async function precacheUrls(
  urls: string[],
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  if (urls.length === 0 || !isServiceWorkerEnabled()) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  let worker: ServiceWorker | null = null;
  try {
    worker = (await navigator.serviceWorker.ready).active;
  } catch {
    // No controlling service worker yet — nothing to do.
  }
  if (!worker) return;

  for (let start = 0; start < urls.length; start += BATCH_SIZE) {
    const batch = urls.slice(start, start + BATCH_SIZE);
    await sendBatch(worker, batch);
    onProgress?.(Math.min(start + batch.length, urls.length), urls.length);
  }
}
