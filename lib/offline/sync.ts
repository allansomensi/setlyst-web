import type { Table } from "dexie";
import { offlineDb } from "./db";
import { precacheUrls } from "./precache";
import type {
  Artist,
  BandWithMembership,
  Gig,
  PaginatedResponse,
  Setlist,
  SetlistItem,
  SetlistSong,
  Song,
  UserPreferences,
} from "@/types/api";

/** Matches the shape of `useApi().fetchApi` from lib/api-client.ts. */
type FetchApi = <T>(
  endpoint: string,
  options?: RequestInit & { suppressAuthRedirect?: boolean },
) => Promise<T>;

const PAGE_SIZE = 100;

// Every call this module makes is a silent background operation — never a
// direct response to something the person clicked and is watching. A 401
// here (a token mid-refresh, a momentary auth hiccup) must never trigger
// the global sign-out/redirect in lib/api-client.ts: that would yank a
// musician out of whatever they're doing (worst case, off Live Mode
// mid-show) because a background resync had bad timing. It just fails this
// one sync item instead; see the option's doc comment in lib/api-client.ts.
const SYNC_FETCH_OPTIONS = { suppressAuthRedirect: true } as const;

/** Coarse phases, for a download that can take a while to report against. */
export type SyncPhase =
  | "idle"
  | "library" // bands, artists, songs, gig and setlist listings
  | "setlists" // each setlist's songs and running order
  | "pages" // handing the page list to the service worker
  | "done";

export interface SyncProgress {
  phase: SyncPhase;
  /** Items finished so far in the current phase, and how many there are. */
  completed: number;
  total: number;
}

export interface SyncResult {
  ok: boolean;
  setlistsSynced: number;
  songsSynced: number;
  gigsSynced: number;
  bandsSynced: number;
  artistsSynced: number;
  error?: string;
}

/** Fetches every page of a paginated endpoint and returns the combined rows. */
async function fetchAllPages<T>(
  fetchApi: FetchApi,
  basePath: string,
): Promise<T[]> {
  const separator = basePath.includes("?") ? "&" : "?";
  const first = await fetchApi<PaginatedResponse<T>>(
    `${basePath}${separator}page=1&per_page=${PAGE_SIZE}`,
    SYNC_FETCH_OPTIONS,
  );
  const rows = [...(first.data ?? [])];
  const totalPages = first.meta?.total_pages ?? 1;

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchApi<PaginatedResponse<T>>(
      `${basePath}${separator}page=${page}&per_page=${PAGE_SIZE}`,
      SYNC_FETCH_OPTIONS,
    );
    rows.push(...(next.data ?? []));
  }

  return rows;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown sync error";
}

/**
 * Replaces a store's entire contents in one transaction.
 *
 * Deleting what's no longer there matters as much as adding what is: a
 * setlist someone removed, or a band they left, would otherwise sit in the
 * local mirror forever and keep showing up offline as though it still
 * existed. Doing it transactionally means a reader never catches the store
 * mid-wipe and concludes there's nothing saved.
 */
async function replaceAll<T>(table: Table<T, string>, rows: T[]) {
  await offlineDb.transaction("rw", table, async () => {
    await table.clear();
    await table.bulkPut(rows);
  });
}

/**
 * Downloads everything this account can *read* into IndexedDB, then hands
 * the service worker the full list of page URLs those records back, so both
 * halves of an offline visit are covered: the data, and the page shells
 * (plus their JS/CSS — see precachePageAssets in public/sw.js) needed to
 * render it.
 *
 * "Everything" is the point. Pressing "download for offline use" is a
 * promise that the app stays fully readable at a venue with no signal —
 * not that the few screens someone happened to open beforehand will work.
 * Only creating and editing require a connection.
 *
 * Safe to call opportunistically and often: it's a full resync rather than
 * an incremental one, but a musician's own library (their songs, setlists,
 * shows — not a catalog) is small enough that keeping the sync logic simple
 * and obviously correct is worth more than the bandwidth a delta sync would
 * save.
 *
 * `locale` decides which locale-prefixed URLs get precached (see
 * lib/offline/precache.ts). `onProgress` is optional and purely for UI.
 */
export async function syncAllForOffline(
  fetchApi: FetchApi,
  locale: string,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  // Collected as we go rather than thrown: one band, one setlist, or the
  // standalone songs list failing (a transient rate limit, a timeout)
  // used to abort the ENTIRE sync via a single outer try/catch — meaning
  // a musician with 40 working setlists and one flaky band call ended up
  // with *nothing* synced that cycle. Every step below is caught
  // individually instead, so a partial sync still saves everything that
  // did succeed; only a real "we got essentially nothing" case is
  // reported as a failure.
  const failures: string[] = [];
  const report = (progress: SyncProgress) => onProgress?.(progress);

  report({ phase: "library", completed: 0, total: 6 });

  // `GET /setlists` and `GET /gigs` only return the user's *personal*
  // records — the list pages account for that by additionally walking
  // every band the user belongs to. Mirror that here, or band-owned
  // setlists and shows (often the majority of what a gigging musician
  // actually has) silently never get cached, even though the sync itself
  // "succeeds".
  const [
    personalSetlistsResult,
    personalGigsResult,
    bandsResult,
    songsResult,
    artistsResult,
    preferencesResult,
  ] = await Promise.allSettled([
    fetchAllPages<Setlist>(fetchApi, "/setlists"),
    fetchAllPages<Gig>(fetchApi, "/gigs"),
    fetchApi<BandWithMembership[]>("/bands", SYNC_FETCH_OPTIONS),
    fetchAllPages<Song>(fetchApi, "/songs"),
    fetchAllPages<Artist>(fetchApi, "/artists"),
    fetchApi<UserPreferences>("/users/me/preferences", SYNC_FETCH_OPTIONS),
  ]);

  function settled<T>(
    result: PromiseSettledResult<T>,
    label: string,
    fallback: T,
  ): T {
    if (result.status === "fulfilled") return result.value;
    failures.push(`${label}: ${errorMessage(result.reason)}`);
    return fallback;
  }

  const personalSetlists = settled(
    personalSetlistsResult,
    "personal setlists",
    [],
  );
  const personalGigs = settled(personalGigsResult, "personal shows", []);
  const bands = settled(bandsResult, "bands", []);
  const songs = settled(songsResult, "songs", []);
  const artists = settled(artistsResult, "artists", []);
  const preferences =
    preferencesResult.status === "fulfilled" ? preferencesResult.value : null;

  report({ phase: "library", completed: 3, total: 6 });

  // Per-band records, each failing independently for the same reason as
  // above: one band's data not loading shouldn't cost the person every
  // other band's.
  const bandRecords = await Promise.all(
    bands.map(async (band) => {
      const [setlistsRes, gigsRes] = await Promise.allSettled([
        fetchAllPages<Setlist>(fetchApi, `/bands/${band.id}/setlists`),
        fetchAllPages<Gig>(fetchApi, `/bands/${band.id}/gigs`),
      ]);
      return {
        setlists: settled(setlistsRes, `${band.name} setlists`, []),
        gigs: settled(gigsRes, `${band.name} shows`, []),
      };
    }),
  );

  const setlists = [
    ...personalSetlists,
    ...bandRecords.flatMap((record) => record.setlists),
  ];
  const gigs = [
    ...personalGigs,
    ...bandRecords.flatMap((record) => record.gigs),
  ];

  report({ phase: "library", completed: 6, total: 6 });

  const syncedAt = Date.now();

  // Everything that arrived as a flat list is written as a whole, so rows
  // deleted upstream disappear locally too.
  let songsSynced = 0;
  let gigsSynced = 0;
  let bandsSynced = 0;
  let artistsSynced = 0;

  if (songsResult.status === "fulfilled") {
    try {
      await replaceAll(
        offlineDb.songs,
        songs.map((song) => ({ id: song.id, song, syncedAt })),
      );
      songsSynced = songs.length;
    } catch (err) {
      failures.push(`saving songs: ${errorMessage(err)}`);
    }
  }

  if (artistsResult.status === "fulfilled") {
    try {
      await replaceAll(
        offlineDb.artists,
        artists.map((artist) => ({ id: artist.id, artist, syncedAt })),
      );
      artistsSynced = artists.length;
    } catch (err) {
      failures.push(`saving artists: ${errorMessage(err)}`);
    }
  }

  if (bandsResult.status === "fulfilled") {
    try {
      await replaceAll(
        offlineDb.bands,
        bands.map((band) => ({ id: band.id, band, syncedAt })),
      );
      bandsSynced = bands.length;
    } catch (err) {
      failures.push(`saving bands: ${errorMessage(err)}`);
    }
  }

  try {
    await replaceAll(
      offlineDb.gigs,
      gigs.map((gig) => ({ id: gig.id, gig, syncedAt })),
    );
    gigsSynced = gigs.length;
  } catch (err) {
    failures.push(`saving shows: ${errorMessage(err)}`);
  }

  if (preferences) {
    try {
      await offlineDb.account.put({
        id: "account",
        preferences,
        syncedAt,
      });
    } catch (err) {
      failures.push(`saving preferences: ${errorMessage(err)}`);
    }
  }

  // The list/landing pages, not just individual items — these are what
  // the service worker falls back to when the app is relaunched offline
  // on a URL nothing has cached yet (e.g. the PWA's start_url after the
  // phone restarts). Without these cached, a successful sync still
  // leaves the user with nowhere guaranteed to land offline. See the
  // fallback-redirect logic in public/sw.js's networkFirst().
  const precacheTargets: string[] = [
    `/${locale}/dashboard`,
    `/${locale}/dashboard/setlists`,
    `/${locale}/dashboard/songs`,
    `/${locale}/dashboard/gigs`,
    `/${locale}/dashboard/bands`,
    `/${locale}/dashboard/artists`,
    `/${locale}/dashboard/profile`,
    `/${locale}/dashboard/settings`,
  ];

  for (const song of songs) {
    precacheTargets.push(
      `/${locale}/dashboard/songs/${song.id}/live`,
      `/${locale}/dashboard/songs/${song.id}/lyrics`,
    );
  }
  for (const gig of gigs) {
    precacheTargets.push(`/${locale}/dashboard/gigs/${gig.id}`);
  }
  for (const band of bands) {
    precacheTargets.push(`/${locale}/dashboard/bands/${band.id}`);
  }

  // Each setlist needs two extra calls (its songs and its running order),
  // so this is the slow phase and the one worth reporting progress for.
  report({ phase: "setlists", completed: 0, total: setlists.length });

  const knownSetlistIds = new Set<string>();
  let setlistsSynced = 0;

  for (const [index, setlist] of setlists.entries()) {
    try {
      const [songsRes, itemsRes] = await Promise.allSettled([
        fetchAllPages<SetlistSong>(fetchApi, `/setlists/${setlist.id}/songs`),
        fetchApi<SetlistItem[]>(
          `/setlists/${setlist.id}/items`,
          SYNC_FETCH_OPTIONS,
        ),
      ]);

      // A setlist whose songs didn't load is not worth storing: a cached
      // setlist that opens to an empty running order at a venue reads as
      // data loss, which is worse than it plainly not being downloaded.
      if (songsRes.status === "rejected") {
        failures.push(`"${setlist.title}": ${errorMessage(songsRes.reason)}`);
        continue;
      }

      await offlineDb.setlists.put({
        id: setlist.id,
        setlist,
        songs: songsRes.value,
        items: itemsRes.status === "fulfilled" ? itemsRes.value : undefined,
        syncedAt,
      });
      knownSetlistIds.add(setlist.id);
      setlistsSynced++;

      precacheTargets.push(
        `/${locale}/dashboard/setlists/${setlist.id}`,
        `/${locale}/dashboard/setlists/${setlist.id}/live`,
      );
    } catch (err) {
      failures.push(`"${setlist.title}": ${errorMessage(err)}`);
    }

    report({
      phase: "setlists",
      completed: index + 1,
      total: setlists.length,
    });
  }

  // Setlists are written one at a time (each needs its own calls and can
  // fail on its own), so the sweep for deleted ones happens here instead
  // of through replaceAll. Only done when the listings themselves loaded —
  // otherwise "not in the list" means "the list failed", and this would
  // wipe a perfectly good local copy.
  const listingsComplete =
    personalSetlistsResult.status === "fulfilled" &&
    bandsResult.status === "fulfilled";
  if (listingsComplete) {
    try {
      const storedIds = await offlineDb.setlists.toCollection().primaryKeys();
      const removed = storedIds.filter((id) => !knownSetlistIds.has(id));
      if (removed.length > 0) await offlineDb.setlists.bulkDelete(removed);
    } catch {
      // A stale row left behind is a much smaller problem than a failed
      // sweep taking the sync down with it.
    }
  }

  report({ phase: "pages", completed: 0, total: precacheTargets.length });
  precacheUrls(precacheTargets);

  // Only a sync that saved essentially nothing (and had something to
  // report about why) counts as a failure — anything that got real data
  // into IndexedDB is worth keeping and worth telling the person "this is
  // available offline", even if one band or one setlist didn't make it.
  const ok =
    setlistsSynced > 0 ||
    songsSynced > 0 ||
    gigsSynced > 0 ||
    failures.length === 0;
  const lastError = failures.length > 0 ? failures.join("; ") : null;

  // Whatever setlists/songs made it into IndexedDB above are already safe
  // — this is just bookkeeping on top. If IndexedDB itself is unusable
  // (see the note in lib/offline/db.ts), this can throw too; that must
  // still surface as an "error" sync result rather than an uncaught
  // rejection, so wrap it rather than letting it propagate raw.
  try {
    await offlineDb.meta.put({
      id: "global",
      lastFullSyncAt: ok
        ? syncedAt
        : ((await offlineDb.meta.get("global"))?.lastFullSyncAt ?? null),
      lastError,
    });
  } catch (err) {
    report({ phase: "done", completed: 0, total: 0 });
    return {
      ok: false,
      setlistsSynced,
      songsSynced,
      gigsSynced,
      bandsSynced,
      artistsSynced,
      error: errorMessage(err),
    };
  }

  // Best-effort: ask the browser not to evict this data under storage
  // pressure. Unsupported or denied silently — there's nothing actionable
  // to do about either from here.
  if (
    typeof navigator !== "undefined" &&
    navigator.storage?.persist &&
    !(await navigator.storage.persisted?.().catch(() => false))
  ) {
    navigator.storage.persist().catch(() => {});
  }

  report({ phase: "done", completed: 0, total: 0 });

  return {
    ok,
    setlistsSynced,
    songsSynced,
    gigsSynced,
    bandsSynced,
    artistsSynced,
    error: lastError ?? undefined,
  };
}
