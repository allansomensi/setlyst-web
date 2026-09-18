"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface OfflineRecordsOptions<TValue> {
  /**
   * Reads this collection out of IndexedDB. Must not throw — wrap the Dexie
   * call in `.catch()`; see the note on error handling below.
   */
  read: () => Promise<TValue[] | undefined>;
  /** Writes the server's copy back into IndexedDB. Best-effort. */
  write: (records: TValue[]) => Promise<unknown>;
  /** What the page was server-rendered with. */
  fallback: TValue[];
  /**
   * True when the page's own server-side fetch failed, so `fallback` is an
   * artificially empty list rather than a genuinely empty one.
   */
  loadError?: boolean;
}

interface OfflineRecordsResult<TValue> {
  records: TValue[];
  /** True when `records` came from the on-device mirror rather than the server. */
  isFromCache: boolean;
}

/**
 * The read path every list screen shares: show the server's data when
 * there is some, and the on-device mirror when there isn't.
 *
 * Two situations put us on the mirror, and they're worth spelling out
 * because they're the difference between "the app works at the venue" and
 * "the app is a row of empty tables at the venue":
 *
 *  - **Offline.** The page itself was served from the service worker's
 *    cache, so its props are a snapshot from whenever that HTML was stored
 *    — possibly days old, possibly from before half the library existed.
 *    The mirror is refreshed as a whole on every sync, so it's both fresher
 *    and more complete. It wins.
 *
 *  - **The server fetch failed** (`loadError`) — a rate limit, a timeout,
 *    the API briefly down. Previously this surfaced as a retrying notice
 *    over an empty table even though a perfectly good local copy existed.
 *    Showing that copy turns a visible failure into a non-event.
 *
 * Online and healthy, the server's data is authoritative and gets written
 * straight back into the mirror, so simply using the app keeps the offline
 * copy current between full syncs.
 *
 * On error handling: dexie-react-hooks re-throws a failed query during
 * render so an error boundary can catch it. Every list in the app would
 * then go down with IndexedDB rather than degrade — so `read` is required
 * to swallow its own failures and resolve to `undefined`, which this hook
 * treats as "nothing cached" and falls back to the props.
 */
export function useOfflineRecords<TValue>({
  read,
  write,
  fallback,
  loadError = false,
}: OfflineRecordsOptions<TValue>): OfflineRecordsResult<TValue> {
  const isOnline = useOnlineStatus();
  const cached = useLiveQuery(read, []);

  const serverDataUsable = isOnline && !loadError;

  useEffect(() => {
    if (!serverDataUsable) return;
    write(fallback).catch(() => {
      // Best-effort: a write failure (quota, private browsing, IndexedDB
      // disabled) only costs this opportunistic refresh. The full sync and
      // this render's own data are unaffected.
    });
    // `write` is recreated on every render at most call sites, so keying on
    // it would write on every render; the data and connectivity are what
    // should actually trigger a refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverDataUsable, fallback]);

  if (!serverDataUsable && cached && cached.length > 0) {
    return { records: cached, isFromCache: true };
  }

  return { records: fallback, isFromCache: false };
}
