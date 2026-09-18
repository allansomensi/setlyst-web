"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { cacheSetlistDetailData } from "@/lib/offline/write";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { Setlist, SetlistItem, SetlistSong } from "@/types/api";

interface SetlistDetail {
  songs: SetlistSong[];
  items: SetlistItem[];
}

interface SetlistDetailResult extends SetlistDetail {
  /** True when this came from the on-device mirror rather than the server. */
  isFromCache: boolean;
}

/**
 * The setlist detail screen's running order, from the server when there's a
 * connection and from the on-device mirror when there isn't.
 *
 * This is the screen someone lands on when they tap a setlist, so it's the
 * one that decides whether "the app works offline" feels true. Reading it
 * from the mirror rather than relying on whatever was embedded in the
 * cached HTML means it shows the state of the last sync — not a snapshot
 * frozen at whenever that page happened to be stored.
 *
 * The write-through merges (see lib/offline/write.ts) so it can't clobber
 * the fields Live Mode maintains.
 */
export function useOfflineSetlistDetail(
  setlist: Setlist,
  fallback: SetlistDetail,
): SetlistDetailResult {
  const isOnline = useOnlineStatus();
  const cached = useLiveQuery(
    () => offlineDb.setlists.get(setlist.id).catch(() => undefined),
    [setlist.id],
  );

  useEffect(() => {
    if (!isOnline) return;
    cacheSetlistDetailData(setlist, fallback.songs, fallback.items).catch(
      () => {
        // Best-effort — see the analogous note in use-offline-setlist-bundle.ts.
      },
    );
  }, [isOnline, setlist, fallback.songs, fallback.items]);

  if (!isOnline && cached) {
    return {
      songs: cached.songs,
      // A bundle written before the mirror tracked running orders (or by
      // Live Mode's narrower write-through) has no items. Falling back to
      // the songs' own order is better than rendering an empty setlist —
      // it loses only the block and break markers.
      items:
        cached.items ??
        cached.songs.map((song, position) => ({
          item_type: "song" as const,
          position,
          song,
        })),
      isFromCache: true,
    };
  }

  return { songs: fallback.songs, items: fallback.items, isFromCache: false };
}
