"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSession } from "next-auth/react";
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
  // While staff view the app as someone else, nothing is mirrored (the
  // viewed account's library must not land in the staff member's offline
  // copy) and the mirror isn't read either (it isn't that account's).
  const impersonating = Boolean(useSession().data?.user?.impersonator);
  // See the identical note in use-offline-setlist-bundle.ts: swallow a
  // query failure into "no cached copy" rather than letting it propagate.
  const cached = useLiveQuery(
    () =>
      impersonating
        ? undefined
        : offlineDb.songs.get(songId).catch(() => undefined),
    [songId, impersonating],
  );

  useEffect(() => {
    if (!isOnline || impersonating) return;
    offlineDb.songs
      .put({ id: fallback.id, song: fallback, syncedAt: Date.now() })
      .catch(() => {
        // Best-effort — see the analogous catch in use-offline-setlist-bundle.ts.
      });
  }, [isOnline, impersonating, fallback]);

  if (!isOnline && cached) {
    return { song: cached.song, syncedAt: cached.syncedAt };
  }

  return { song: fallback, syncedAt: cached?.syncedAt ?? null };
}
