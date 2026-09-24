"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocale } from "next-intl";
import { useApi } from "@/lib/api-client";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { offlineDb } from "@/lib/offline/db";
import { ensureOfflineOwner } from "@/lib/offline/owner";
import { syncAllForOffline, type SyncProgress } from "@/lib/offline/sync";

type SyncStatus = "idle" | "syncing" | "error";

interface OfflineSyncContextValue {
  status: SyncStatus;
  /** How far along the current download is — see SyncProgress. */
  progress: SyncProgress;
  /** epoch ms of the last successful full sync, or null if none yet. */
  lastSyncedAt: number | null;
  lastError: string | null;
  /** Triggers an immediate resync. Safe to call while one is in flight — it's a no-op then. */
  syncNow: () => void;
  /** Whether a given setlist currently has an offline copy on this device. */
  isSetlistCached: (setlistId: string) => boolean;
  /** Whether a given standalone song currently has an offline copy on this device. */
  isSongCached: (songId: string) => boolean;
  /** How much of the library is mirrored on this device — for a "N items available offline" summary. */
  cachedSetlistCount: number;
  cachedSongCount: number;
  cachedGigCount: number;
  cachedBandCount: number;
}

const IDLE_PROGRESS: SyncProgress = {
  phase: "idle",
  completed: 0,
  total: 0,
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

/** Just what's on the device, see useOfflineCache. */
type OfflineCacheContextValue = Pick<
  OfflineSyncContextValue,
  | "isSetlistCached"
  | "isSongCached"
  | "cachedSetlistCount"
  | "cachedSongCount"
  | "cachedGigCount"
  | "cachedBandCount"
>;

const OfflineCacheContext = createContext<OfflineCacheContextValue | null>(
  null,
);

/**
 * The ids as one string: a sync writes setlists one at a time, and each
 * write re-runs the live query with the same keys (in the same order,
 * primary keys come sorted). Memoizing on this rather than on the array
 * keeps every row's indicator from re-rendering for nothing.
 */
function idsKey(ids: readonly string[] | undefined): string {
  return (ids ?? []).join("\n");
}

function idSet(key: string): Set<string> {
  return new Set(key ? key.split("\n") : []);
}

// Re-sync periodically while the app is open and online, so data doesn't
// quietly go stale during a long rehearsal or a day of edits before a show.
const BACKGROUND_SYNC_INTERVAL_MS = 15 * 60 * 1000;

// Automatic syncs (page load, reconnect, the interval, the tab coming back
// into view) are skipped while the last full sync is younger than this.
// Every reload, every new tab and every PWA launch used to download the
// whole library again (two calls per setlist, plus every page shell),
// which on a small API server is most of its load. The mirror is also
// kept warm by the screens themselves (lib/offline/write.ts), so a few
// minutes of age is harmless. "Sync now" always runs.
const AUTO_SYNC_MIN_AGE_MS = 10 * 60 * 1000;

// How long after the app opens (or comes back online) the first automatic
// sync waits.
const INITIAL_SYNC_DELAY_MS = 5_000;

// Held while a sync runs, so two open tabs never download the library at
// the same time (Web Locks are shared by every tab of the origin).
const SYNC_LOCK_NAME = "setlyst-offline-sync";

/**
 * Runs `task` while holding the cross-tab sync lock. With `wait` false it
 * gives up (null) when another tab already holds it. Browsers without Web
 * Locks just run the task.
 */
async function withSyncLock<T>(
  wait: boolean,
  task: () => Promise<T>,
): Promise<T | null> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return task();
  return locks.request(SYNC_LOCK_NAME, { ifAvailable: !wait }, async (lock) =>
    lock ? task() : null,
  );
}

async function lastFullSyncAge(): Promise<number> {
  try {
    const meta = await offlineDb.meta.get("global");
    return meta?.lastFullSyncAt ? Date.now() - meta.lastFullSyncAt : Infinity;
  } catch {
    return Infinity;
  }
}

/**
 * Keeps the offline data layer (lib/offline/db.ts) warm: syncs every
 * setlist and song into IndexedDB whenever the app is online, so Live Mode
 * and the setlist pages have a fresh, complete local copy to fall back on
 * — not just whatever happened to be embedded in the last page someone
 * loaded. Renders nothing; mount once near the root, inside the session
 * provider (it needs an authenticated API client).
 */
export function OfflineSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status: sessionStatus } = useSession();
  // Never mirror someone else's library onto this device: while staff are
  // "viewing as" another user, the offline copy stays the staff member's
  // own and background sync is paused.
  const userId =
    sessionStatus === "authenticated" &&
    !session?.error &&
    !session?.user?.impersonator
      ? (session?.user?.id ?? null)
      : null;

  // The mirror on this device must belong to whoever is signed in now; a
  // different account wipes it (and the cached pages) before anything is
  // synced or shown. See lib/offline/owner.ts.
  const [ownerCheckedFor, setOwnerCheckedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    ensureOfflineOwner(userId).finally(() => {
      if (!cancelled) setOwnerCheckedFor(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isAuthenticated = userId !== null && ownerCheckedFor === userId;
  const isOnline = useOnlineStatus();
  const { fetchApi } = useApi();
  const locale = useLocale();

  const [status, setStatus] = useState<SyncStatus>("idle");
  const [progress, setProgress] = useState<SyncProgress>(IDLE_PROGRESS);
  const syncingRef = useRef(false);

  // Every query below is wrapped in its own try/catch rather than left to
  // reject: dexie-react-hooks' useLiveQuery deliberately re-throws a
  // rejected query on the next render so an error boundary can catch it —
  // and this provider sits at the root of the whole locale layout, so an
  // uncaught IndexedDB failure here (storage disabled by policy, a
  // private-browsing mode that cripples IndexedDB, a corrupted local
  // database) used to take down every single page in the app, not just the
  // offline mirror. Falling back to "no data yet" instead means the rest
  // of the app — which works fine without an offline copy — is completely
  // unaffected; only the offline-specific UI (badges, the settings card)
  // ends up permanently showing "not saved offline", which is the honest
  // state anyway.
  const meta = useLiveQuery(
    () => offlineDb.meta.get("global").catch(() => undefined),
    [],
  );
  const cachedSetlistIds = useLiveQuery(
    () =>
      offlineDb.setlists
        .toCollection()
        .primaryKeys()
        .catch(() => [] as string[]),
    [],
  );
  const cachedSongIds = useLiveQuery(
    () =>
      offlineDb.songs
        .toCollection()
        .primaryKeys()
        .catch(() => [] as string[]),
    [],
  );
  const cachedGigCount = useLiveQuery(
    () => offlineDb.gigs.count().catch(() => 0),
    [],
  );
  const cachedBandCount = useLiveQuery(
    () => offlineDb.bands.count().catch(() => 0),
    [],
  );

  // `force` is a person pressing "sync now": it waits for another tab's
  // sync to finish and ignores the age of the last one. Automatic syncs
  // give way to both (see AUTO_SYNC_MIN_AGE_MS and SYNC_LOCK_NAME).
  const runSync = useCallback(
    (force: boolean) => {
      if (syncingRef.current || !isAuthenticated) return;
      syncingRef.current = true;

      withSyncLock(force, async () => {
        if (!force && (await lastFullSyncAge()) < AUTO_SYNC_MIN_AGE_MS) {
          return null;
        }
        setStatus("syncing");
        setProgress({ phase: "library", completed: 0, total: 0 });
        return syncAllForOffline(fetchApi, locale, setProgress);
      })
        .then((result) => {
          if (result) setStatus(result.ok ? "idle" : "error");
        })
        .catch(() => {
          setStatus("error");
        })
        .finally(() => {
          syncingRef.current = false;
          setProgress(IDLE_PROGRESS);
        });
    },
    [fetchApi, locale, isAuthenticated],
  );

  const syncNow = useCallback(() => runSync(true), [runSync]);

  // The interval below is intentionally NOT re-armed every time `runSync`
  // changes identity (e.g. NextAuth silently rotating the session token) —
  // doing that would resync far more often than the 15-minute cadence
  // intends. But the interval callback still has to call the LATEST
  // `syncNow`, not whichever one existed when the interval was created:
  // capturing a stale one used to mean a long-open tab kept calling the API
  // with an old, already-rotated token, which read as a wall of "sync
  // failed" — or worse, was misread by the server as an auth problem — for
  // no reason a person watching the tab could see. A ref sidesteps that
  // without re-arming the interval.
  const autoSyncRef = useRef(() => runSync(false));
  useEffect(() => {
    autoSyncRef.current = () => runSync(false);
  }, [runSync]);

  // Sync on load and whenever connectivity comes back, then keep it fresh
  // on an interval for as long as the tab stays open and online. A tab in
  // the background skips its ticks and catches up when it's shown again.
  useEffect(() => {
    if (!isAuthenticated || !isOnline) return;

    // Not during the page's own first load: the sync would compete with
    // it for the same server.
    const initial = setTimeout(
      () => autoSyncRef.current(),
      INITIAL_SYNC_DELAY_MS,
    );
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") autoSyncRef.current();
    }, BACKGROUND_SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") autoSyncRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, isOnline]);

  // Sets, not arrays: every row of a long list asks, and `includes` made
  // each question walk the whole library.
  const setlistKey = idsKey(cachedSetlistIds);
  const songKey = idsKey(cachedSongIds);
  const cachedSetlistSet = useMemo(() => idSet(setlistKey), [setlistKey]);
  const cachedSongSet = useMemo(() => idSet(songKey), [songKey]);

  const isSetlistCached = useCallback(
    (setlistId: string) => cachedSetlistSet.has(setlistId),
    [cachedSetlistSet],
  );

  const isSongCached = useCallback(
    (songId: string) => cachedSongSet.has(songId),
    [cachedSongSet],
  );

  const lastSyncedAt = meta?.lastFullSyncAt ?? null;
  const lastError = meta?.lastError ?? null;
  const value = useMemo<OfflineSyncContextValue>(
    () => ({
      status,
      progress,
      lastSyncedAt,
      lastError,
      syncNow,
      isSetlistCached,
      isSongCached,
      cachedSetlistCount: cachedSetlistSet.size,
      cachedSongCount: cachedSongSet.size,
      cachedGigCount: cachedGigCount ?? 0,
      cachedBandCount: cachedBandCount ?? 0,
    }),
    [
      status,
      progress,
      lastSyncedAt,
      lastError,
      syncNow,
      isSetlistCached,
      isSongCached,
      cachedSetlistSet,
      cachedSongSet,
      cachedGigCount,
      cachedBandCount,
    ],
  );

  // A separate context for the per-row indicators, so the progress
  // updates of a running sync don't re-render every row of a list.
  const cacheValue = useMemo<OfflineCacheContextValue>(
    () => ({
      isSetlistCached,
      isSongCached,
      cachedSetlistCount: cachedSetlistSet.size,
      cachedSongCount: cachedSongSet.size,
      cachedGigCount: cachedGigCount ?? 0,
      cachedBandCount: cachedBandCount ?? 0,
    }),
    [
      isSetlistCached,
      isSongCached,
      cachedSetlistSet,
      cachedSongSet,
      cachedGigCount,
      cachedBandCount,
    ],
  );

  return (
    <OfflineSyncContext.Provider value={value}>
      <OfflineCacheContext.Provider value={cacheValue}>
        {children}
      </OfflineCacheContext.Provider>
    </OfflineSyncContext.Provider>
  );
}

/**
 * What's saved on this device, without the sync's status and progress:
 * for components that only show whether something is available offline.
 */
export function useOfflineCache(): OfflineCacheContextValue {
  const ctx = useContext(OfflineCacheContext);
  if (!ctx) {
    throw new Error("useOfflineCache must be used within OfflineSyncProvider");
  }
  return ctx;
}

/** Reads offline-sync status/controls set up by `OfflineSyncProvider`. */
export function useOfflineSync(): OfflineSyncContextValue {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return ctx;
}
