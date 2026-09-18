import { offlineDb } from "./db";
import type { Setlist, SetlistItem, SetlistSong } from "@/types/api";

/**
 * Write-through helpers for the setlist mirror.
 *
 * A setlist's bundle is assembled from more than one screen: Live Mode
 * knows the setlist and its songs, the detail screen additionally knows the
 * running order with its block and break markers, and a full sync fetches
 * all three. Each of them keeps the mirror warm as the app is used — which
 * means none of them can write with `put`, because that replaces the whole
 * row and would silently drop whatever the *other* screens had filled in.
 * Opening Live Mode would erase the running order; opening the detail
 * screen would erase it right back.
 *
 * So each writer merges only its own fields, and falls back to creating the
 * row when there isn't one yet (`update` matches nothing for a setlist that
 * has never been synced).
 */

export async function cacheSetlistLiveData(
  setlist: Setlist,
  songs: SetlistSong[],
): Promise<void> {
  const syncedAt = Date.now();
  const updated = await offlineDb.setlists.update(setlist.id, {
    setlist,
    songs,
    syncedAt,
  });
  if (updated === 0) {
    await offlineDb.setlists.put({ id: setlist.id, setlist, songs, syncedAt });
  }
}

export async function cacheSetlistDetailData(
  setlist: Setlist,
  songs: SetlistSong[],
  items: SetlistItem[],
): Promise<void> {
  const syncedAt = Date.now();
  const updated = await offlineDb.setlists.update(setlist.id, {
    setlist,
    songs,
    items,
    syncedAt,
  });
  if (updated === 0) {
    await offlineDb.setlists.put({
      id: setlist.id,
      setlist,
      songs,
      items,
      syncedAt,
    });
  }
}
