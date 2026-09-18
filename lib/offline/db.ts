import Dexie, { type Table } from "dexie";
import type {
  Artist,
  BandWithMembership,
  Gig,
  Setlist,
  SetlistItem,
  SetlistSong,
  Song,
  UserPreferences,
} from "@/types/api";

/**
 * The local, on-device mirror of whatever a musician needs to run a show
 * with zero connectivity: a setlist's songs and lyrics, and standalone
 * songs opened in single-song Live Mode.
 *
 * Deliberately modeled as small, self-contained "bundles" (one row per
 * setlist, one row per song) rather than a fully normalized relational
 * schema — there's no need to join across setlists here, and a bundle
 * matches exactly what each screen already renders, so reading it back
 * requires no extra assembly step.
 *
 * The scope is *everything the app can show you*, not just Live Mode:
 * pressing "download for offline use" is a promise that the whole app
 * stays readable with no signal — browsing setlists, opening a show,
 * checking a band, reading lyrics — with only creating and editing
 * unavailable. Anything left out of this mirror is a screen that silently
 * turns into a dead end at a venue, which is worse than not offering
 * offline support at all.
 */

export interface CachedSetlistBundle {
  /** Setlist id — primary key. */
  id: string;
  setlist: Setlist;
  /** Songs in performance order, exactly as `/setlists/{id}/songs` returns. */
  songs: SetlistSong[];
  /**
   * The setlist's full running order including block and break markers, as
   * `/setlists/{id}/items` returns it — what the setlist detail screen
   * renders. Optional because a bundle written by an older version of the
   * app (or by the per-page write-through in useOfflineSetlistBundle, which
   * only has the Live Mode data to hand) won't have it.
   */
  items?: SetlistItem[];
  /** epoch ms — when this bundle was last refreshed from the API. */
  syncedAt: number;
}

export interface CachedSongBundle {
  /** Song id — primary key. */
  id: string;
  song: Song;
  syncedAt: number;
}

export interface CachedGig {
  id: string;
  gig: Gig;
  syncedAt: number;
}

export interface CachedBand {
  id: string;
  band: BandWithMembership;
  syncedAt: number;
}

export interface CachedArtist {
  id: string;
  artist: Artist;
  syncedAt: number;
}

/**
 * Single-row store for the account-level things every screen needs but
 * nothing owns — currently just the user's preferences, which Live Mode
 * reads for its starting font size.
 */
export interface CachedAccount {
  id: "account";
  preferences: UserPreferences | null;
  syncedAt: number;
}

export interface SyncMeta {
  id: "global";
  lastFullSyncAt: number | null;
  lastError: string | null;
}

class OfflineDatabase extends Dexie {
  setlists!: Table<CachedSetlistBundle, string>;
  songs!: Table<CachedSongBundle, string>;
  gigs!: Table<CachedGig, string>;
  bands!: Table<CachedBand, string>;
  artists!: Table<CachedArtist, string>;
  account!: Table<CachedAccount, string>;
  meta!: Table<SyncMeta, string>;

  constructor() {
    super("setlyst-offline");
    this.version(1).stores({
      setlists: "id, syncedAt",
      songs: "id, syncedAt",
      meta: "id",
    });
    // v2 widens the mirror from "what Live Mode needs" to "everything the
    // app can show you". Dexie carries v1's rows forward untouched — the
    // added stores simply start empty and fill on the next sync, and the
    // new `items` field on a setlist bundle is optional for exactly that
    // reason.
    this.version(2).stores({
      setlists: "id, syncedAt",
      songs: "id, syncedAt",
      gigs: "id, syncedAt",
      bands: "id, syncedAt",
      artists: "id, syncedAt",
      account: "id",
      meta: "id",
    });
  }
}

// A single shared instance — Dexie handles concurrent opens fine, but one
// instance per tab keeps the "ready" bookkeeping and live queries simple.
//
// Dexie opens the underlying IndexedDB connection lazily (on first real
// use), so this construction itself won't throw even in environments with
// no usable IndexedDB (some in-app webviews, storage disabled by policy,
// certain private-browsing modes) — the failure surfaces later, as a
// rejected promise from whatever query actually ran. That distinction
// matters: it means every read/write against `offlineDb` has to be treated
// as best-effort and able to fail at any time, never assumed to succeed
// just because building this instance didn't throw. See
// components/providers/offline-sync-provider.tsx and the
// useOfflineSetlistBundle/useOfflineSongBundle hooks for where that's
// actually enforced (every live query there is wrapped so a failure here
// can only ever disable the offline mirror for this session — never take
// down the rest of the app, which works fine without it).
export const offlineDb = new OfflineDatabase();

export async function getSyncMeta(): Promise<SyncMeta> {
  const existing = await offlineDb.meta.get("global");
  return existing ?? { id: "global", lastFullSyncAt: null, lastError: null };
}
