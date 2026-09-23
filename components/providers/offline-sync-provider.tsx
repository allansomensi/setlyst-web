"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

// Re-sync periodically while the app is open and online, so data doesn't
// quietly go stale during a long rehearsal or a day of edits before a show.
const BACKGROUND_SYNC_INTERVAL_MS = 15 * 60 * 1000;

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

  const syncNow = useCallback(() => {
    if (syncingRef.current || !isAuthenticated) return;
    syncingRef.current = true;
    setStatus("syncing");
    setProgress({ phase: "library", completed: 0, total: 0 });

    syncAllForOffline(fetchApi, locale, setProgress)
      .then((result) => {
        setStatus(result.ok ? "idle" : "error");
      })
      .catch(() => {
        setStatus("error");
      })
      .finally(() => {
        syncingRef.current = false;
        setProgress(IDLE_PROGRESS);
      });
  }, [fetchApi, locale, isAuthenticated]);

  // The interval below is intentionally NOT re-armed every time `syncNow`
  // changes identity (e.g. NextAuth silently rotating the session token) —
  // doing that would resync far more often than the 15-minute cadence
  // intends. But the interval callback still has to call the LATEST
  // `syncNow`, not whichever one existed when the interval was created:
  // capturing a stale one used to mean a long-open tab kept calling the API
  // with an old, already-rotated token, which read as a wall of "sync
  // failed" — or worse, was misread by the server as an auth problem — for
  // no reason a person watching the tab could see. A ref sidesteps that
  // without re-arming the interval.
  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  // Sync on load and whenever connectivity comes back, then keep it fresh
  // on an interval for as long as the tab stays open and online.
  useEffect(() => {
    if (!isAuthenticated || !isOnline) return;

    syncNowRef.current();
    const interval = setInterval(
      () => syncNowRef.current(),
      BACKGROUND_SYNC_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [isAuthenticated, isOnline]);

  const isSetlistCached = useCallback(
    (setlistId: string) => cachedSetlistIds?.includes(setlistId) ?? false,
    [cachedSetlistIds],
  );

  const isSongCached = useCallback(
    (songId: string) => cachedSongIds?.includes(songId) ?? false,
    [cachedSongIds],
  );

  const value: OfflineSyncContextValue = {
    status,
    progress,
    lastSyncedAt: meta?.lastFullSyncAt ?? null,
    lastError: meta?.lastError ?? null,
    syncNow,
    isSetlistCached,
    isSongCached,
    cachedSetlistCount: cachedSetlistIds?.length ?? 0,
    cachedSongCount: cachedSongIds?.length ?? 0,
    cachedGigCount: cachedGigCount ?? 0,
    cachedBandCount: cachedBandCount ?? 0,
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

/** Reads offline-sync status/controls set up by `OfflineSyncProvider`. */
export function useOfflineSync(): OfflineSyncContextValue {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return ctx;
}
