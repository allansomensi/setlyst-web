"use client";

import { useEffect, useEffectEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSession } from "next-auth/react";
import { offlineDb } from "@/lib/offline/db";
import {
  cacheSetlistDetailData,
  cacheSetlistLiveData,
} from "@/lib/offline/write";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { Setlist, SetlistItem, SetlistSong } from "@/types/api";

interface SetlistBundleFallback {
  setlist: Setlist;
  songs: SetlistSong[];
  /**
   * The running order with its block and break markers, when the page
   * managed to load it. Only feeds the block indicator, so it's optional:
   * Live Mode works fine without it.
   */
  items?: SetlistItem[] | null;
}

interface SetlistBundleResult extends SetlistBundleFallback {
  /** epoch ms the on-device copy shown was synced, or null when showing the server-rendered fallback. */
  syncedAt: number | null;
}

/**
 * Feeds Live Mode a setlist bundle that's always correct, whether there's a
 * connection or not:
 *
 *  - Online: trusts the fresh props this page/component was just given —
 *    a server-rendered load, or the result of `router.refresh()` after a
 *    mutation — over whatever the on-device mirror happens to hold. The
 *    mirror is only ever refreshed by a full background sync (every 15
 *    minutes) or a manual "download for offline use", so unconditionally
 *    preferring it (the original behavior here) meant reordering a
 *    setlist, adding a song, or fixing a lyric and then hitting Play could
 *    show the *previous* version for up to 15 minutes — silently, with no
 *    error, which is exactly the kind of "it's just wrong sometimes" bug
 *    that erodes trust in the whole offline feature.
 *  - Offline: falls back to the on-device mirror, which is the only copy
 *    that can possibly still be accurate once the network is gone.
 *
 * It also keeps that mirror warm itself: every time this bundle is read
 * while online, it writes the fresh copy straight into IndexedDB. That's
 * what makes an edit made seconds ago already safe to rely on offline,
 * instead of depending on the next scheduled or manual full sync to catch
 * up.
 */
export function useOfflineSetlistBundle(
  setlistId: string,
  fallback: SetlistBundleFallback,
): SetlistBundleResult {
  const isOnline = useOnlineStatus();
  // While staff view the app as someone else, nothing is mirrored (the
  // viewed account's library must not land in the staff member's offline
  // copy) and the mirror isn't read either (it isn't that account's).
  const impersonating = Boolean(useSession().data?.user?.impersonator);
  // Swallows a query failure into "no cached copy" instead of letting
  // dexie-react-hooks re-throw it on the next render — see the identical
  // note in offline-sync-provider.tsx. Falling back to `fallback` (the
  // server-rendered props) is always a safe, correct result even if the
  // offline mirror itself is broken.
  //
  // Only read offline, the one time it's shown. Online, every write to the
  // mirror — the write-through below, each background sync — re-ran this
  // query: the whole bundle, every song's lyrics included, deserialised on
  // the main thread and a Live Mode re-render, mid-song, for nothing.
  const cached = useLiveQuery(
    () =>
      impersonating || isOnline
        ? undefined
        : offlineDb.setlists.get(setlistId).catch(() => undefined),
    [setlistId, impersonating, isOnline],
  );

  // Reads `impersonating` when writing without re-running on it: when a
  // view-as ends, the page still holds the viewed account's setlist, and
  // re-running then would write it into the staff member's freshly
  // cleared offline copy.
  const isImpersonating = useEffectEvent(() => impersonating);

  useEffect(() => {
    if (!isOnline || isImpersonating()) return;
    // Merges rather than replaces: without the running order this screen
    // doesn't know the setlist's block/break markers, and writing the whole
    // row would drop them. See lib/offline/write.ts.
    const write = fallback.items
      ? cacheSetlistDetailData(fallback.setlist, fallback.songs, fallback.items)
      : cacheSetlistLiveData(fallback.setlist, fallback.songs);
    write.catch(() => {
      // Best-effort opportunistic refresh (quota pressure, private
      // browsing without IndexedDB, etc.) — the periodic/manual full
      // sync and this render's own fresh props still work normally.
    });
    // Re-runs whenever the data this component actually has changes, not on
    // every render (isOnline flips are the only other thing that should
    // re-trigger this, to catch up the moment connectivity returns).
  }, [isOnline, fallback.setlist, fallback.songs, fallback.items]);

  if (!isOnline && cached) {
    return {
      setlist: cached.setlist,
      songs: cached.songs,
      items: cached.items ?? null,
      syncedAt: cached.syncedAt,
    };
  }

  return {
    setlist: fallback.setlist,
    songs: fallback.songs,
    items: fallback.items ?? null,
    syncedAt: null,
  };
}
