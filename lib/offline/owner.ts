import { offlineDb } from "./db";

/** Cache Storage entries created by public/sw.js all start with this. */
export const APP_CACHE_PREFIX = "setlyst";

/** Races a best-effort cleanup step against a deadline. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

/**
 * Deletes every page and asset the service worker saved for offline use,
 * and tells the worker to drop anything it holds in memory.
 */
export async function clearAppCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(APP_CACHE_PREFIX))
          .map((key) => caches.delete(key)),
      );
    } catch {
      // Storage unavailable (private mode, policy): nothing cached anyway.
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      navigator.serviceWorker.controller?.postMessage({ type: "CLEAR" });
      const registration = await withTimeout(
        navigator.serviceWorker.getRegistration(),
        1_000,
      );
      if (registration) {
        registration.active?.postMessage({ type: "CLEAR" });
        registration.waiting?.postMessage({ type: "CLEAR" });
      }
    } catch {
      // No service worker: nothing to tell.
    }
  }
}

/** Empties every table of the offline mirror (the database stays open). */
export async function clearOfflineTables(): Promise<void> {
  try {
    await offlineDb.transaction("rw", offlineDb.tables, async () => {
      await Promise.all(offlineDb.tables.map((table) => table.clear()));
    });
  } catch {
    // IndexedDB unusable: there is no offline copy to leak either.
  }
}

/**
 * Makes sure the offline mirror on this device belongs to `userId`.
 *
 * The device may be shared (a band's rehearsal laptop, a venue tablet):
 * when someone else signs in, whatever the previous person saved for
 * offline use (lyrics, setlists, cached pages) must not be readable by the
 * new one. The mirror records its owner; on a mismatch, or on data written
 * by a build that didn't record one, everything is wiped before the new
 * sync starts.
 *
 * Returns true when data had to be wiped.
 */
export async function ensureOfflineOwner(userId: string): Promise<boolean> {
  try {
    const meta = await offlineDb.meta.get("global");
    if (meta?.userId === userId) return false;

    const hasData = meta != null || (await offlineDb.setlists.count()) > 0;
    if (hasData) {
      await clearOfflineTables();
      await clearAppCaches();
    }

    await offlineDb.meta.put({
      id: "global",
      lastFullSyncAt: null,
      lastError: null,
      userId,
    });
    return hasData;
  } catch {
    return false;
  }
}

/**
 * Removes every trace of the offline mirror: the IndexedDB database itself
 * and the service worker caches. Used on sign-out.
 */
export async function destroyOfflineData(): Promise<void> {
  await Promise.all([
    withTimeout(
      offlineDb.delete().catch(() => clearOfflineTables()),
      2_000,
    ),
    withTimeout(clearAppCaches(), 2_000),
  ]);
}

/**
 * Same cleanup as destroyOfflineData, but keeps the (now empty) database
 * open: for pages that stay mounted afterwards, such as the login page
 * reached after a session expired, where the next sign-in happens without
 * a reload and syncs into the same database.
 */
export async function clearOfflineData(): Promise<void> {
  await Promise.all([
    withTimeout(clearOfflineTables(), 2_000),
    withTimeout(clearAppCaches(), 2_000),
  ]);
}

/**
 * Called whenever the login page opens: being there means this device has
 * no usable session (signed out, revoked, or simply expired while away,
 * when the browser has already dropped the cookie and nothing says why).
 * If an account's offline copy is still on the device, it goes, together
 * with the pages the service worker kept: a shared tablet or band laptop
 * must not keep the last person's repertoire readable offline.
 *
 * Returns true when something was cleared.
 */
export async function clearOfflineDataIfOwned(): Promise<boolean> {
  let owned = false;
  try {
    const meta = await offlineDb.meta.get("global");
    owned =
      Boolean(meta?.userId) ||
      (await offlineDb.setlists.count()) > 0 ||
      (await offlineDb.songs.count()) > 0;
  } catch {
    // IndexedDB unusable: the page cache may still hold pages.
  }
  if (!owned) owned = await hasCachedPages();
  if (owned) await clearOfflineData();
  return owned;
}

/** Whether the service worker kept any account page (beyond the offline page). */
async function hasCachedPages(): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      if (!key.startsWith(APP_CACHE_PREFIX) || !key.endsWith("-pages")) {
        continue;
      }
      const requests = await (await caches.open(key)).keys();
      if (
        requests.some((request) =>
          new URL(request.url).pathname.includes("/dashboard"),
        )
      ) {
        return true;
      }
    }
  } catch {
    // Storage unavailable: nothing readable either.
  }
  return false;
}
