"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { Song } from "@/types/api";

interface SongBundleResult {
  song: Song;
  syncedAt: number | null;
}

/**
 * Single-song counterpart to useOfflineSetlistBundle — see that hook for
 * why the fresh props win while online (with an opportunistic write-through
 * into IndexedDB) and the on-device mirror only takes over once offline.
 */
export function useOfflineSongBundle(
  songId: string,
  fallback: Song,
): SongBundleResult {
  const isOnline = useOnlineStatus();
  // See the identical note in use-offline-setlist-bundle.ts: swallow a
  // query failure into "no cached copy" rather than letting it propagate.
  const cached = useLiveQuery(
    () => offlineDb.songs.get(songId).catch(() => undefined),
    [songId],
  );

  useEffect(() => {
    if (!isOnline) return;
    offlineDb.songs
      .put({ id: fallback.id, song: fallback, syncedAt: Date.now() })
      .catch(() => {
        // Best-effort — see the analogous catch in use-offline-setlist-bundle.ts.
      });
  }, [isOnline, fallback]);

  if (!isOnline && cached) {
    return { song: cached.song, syncedAt: cached.syncedAt };
  }

  return { song: fallback, syncedAt: cached?.syncedAt ?? null };
}
