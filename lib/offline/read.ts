import { offlineDb } from "./db";
import type { Gig, Song, UserPreferences } from "@/types/api";

/**
 * Plain, promise-returning reads of the on-device mirror, for the places
 * that need a single record inside an effect rather than a live query
 * (hooks/use-offline-library.ts covers the reactive, list-shaped cases).
 *
 * Every one of these resolves to `undefined` rather than rejecting. Callers
 * reach for them exactly when something else has already gone wrong — the
 * network is gone, an API call just failed — and a second failure at that
 * point should narrow to "nothing saved for this one", never widen into an
 * unhandled rejection on a screen that's already recovering.
 */

export async function readCachedSong(id: string): Promise<Song | undefined> {
  try {
    const row = await offlineDb.songs.get(id);
    return row?.song;
  } catch {
    return undefined;
  }
}

export async function readCachedGig(id: string): Promise<Gig | undefined> {
  try {
    const row = await offlineDb.gigs.get(id);
    return row?.gig;
  } catch {
    return undefined;
  }
}

export async function readCachedPreferences(): Promise<
  UserPreferences | undefined
> {
  try {
    const row = await offlineDb.account.get("account");
    return row?.preferences ?? undefined;
  } catch {
    return undefined;
  }
}
