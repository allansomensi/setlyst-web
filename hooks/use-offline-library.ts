"use client";

import { offlineDb } from "@/lib/offline/db";
import { useOfflineRecords } from "@/hooks/use-offline-records";
import type {
  Artist,
  BandWithMembership,
  Gig,
  Setlist,
  Song,
} from "@/types/api";

/**
 * One hook per list screen, all of them the same shape: hand in what the
 * server rendered, get back what should actually be displayed (see
 * use-offline-records.ts for when those differ).
 *
 * Each `read` swallows its own IndexedDB errors — that contract is what
 * keeps a storage failure from taking the screen down with it. Each
 * `write` is the write-through that keeps the mirror current as the app is
 * used, rather than only when a full sync runs.
 *
 * Sorting is left exactly as the caller's data arrives: these lists are
 * re-sorted client-side by the table controls anyway, and rows come out of
 * Dexie in primary-key order, which is stable.
 */

interface ListOptions<T> {
  fallback: T[];
  loadError?: boolean;
}

export function useOfflineSetlists({
  fallback,
  loadError,
}: ListOptions<Setlist>) {
  return useOfflineRecords<Setlist>({
    read: () =>
      offlineDb.setlists
        .toArray()
        .then((rows) => rows.map((row) => row.setlist))
        .catch(() => undefined),
    write: (setlists) =>
      offlineDb.setlists.bulkUpdate(
        setlists.map((setlist) => ({
          key: setlist.id,
          changes: { setlist },
        })),
      ),
    fallback,
    loadError,
  });
}

export function useOfflineSongs({ fallback, loadError }: ListOptions<Song>) {
  return useOfflineRecords<Song>({
    read: () =>
      offlineDb.songs
        .toArray()
        .then((rows) => rows.map((row) => row.song))
        .catch(() => undefined),
    write: (songs) =>
      offlineDb.songs.bulkPut(
        songs.map((song) => ({ id: song.id, song, syncedAt: Date.now() })),
      ),
    fallback,
    loadError,
  });
}

export function useOfflineGigs({ fallback, loadError }: ListOptions<Gig>) {
  return useOfflineRecords<Gig>({
    read: () =>
      offlineDb.gigs
        .toArray()
        .then((rows) => rows.map((row) => row.gig))
        .catch(() => undefined),
    write: (gigs) =>
      offlineDb.gigs.bulkPut(
        gigs.map((gig) => ({ id: gig.id, gig, syncedAt: Date.now() })),
      ),
    fallback,
    loadError,
  });
}

export function useOfflineArtists({
  fallback,
  loadError,
}: ListOptions<Artist>) {
  return useOfflineRecords<Artist>({
    read: () =>
      offlineDb.artists
        .toArray()
        .then((rows) => rows.map((row) => row.artist))
        .catch(() => undefined),
    write: (artists) =>
      offlineDb.artists.bulkPut(
        artists.map((artist) => ({
          id: artist.id,
          artist,
          syncedAt: Date.now(),
        })),
      ),
    fallback,
    loadError,
  });
}

export function useOfflineBands({
  fallback,
  loadError,
}: ListOptions<BandWithMembership>) {
  return useOfflineRecords<BandWithMembership>({
    read: () =>
      offlineDb.bands
        .toArray()
        .then((rows) => rows.map((row) => row.band))
        .catch(() => undefined),
    write: (bands) =>
      offlineDb.bands.bulkPut(
        bands.map((band) => ({ id: band.id, band, syncedAt: Date.now() })),
      ),
    fallback,
    loadError,
  });
}
