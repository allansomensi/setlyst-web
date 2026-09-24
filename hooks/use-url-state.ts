"use client";

import { useEffect, useRef } from "react";

/**
 * Writes list state (search, filter, sort, page) into the address bar
 * without a navigation: `history.replaceState` is picked up by Next's
 * `useSearchParams` but, unlike `router.replace`, doesn't refetch the
 * page from the server on every keystroke — and never adds history
 * entries, so Back still leaves the list.
 *
 * Coming back to the list (Back from a song) then restores exactly the
 * page, filter and sort that were on screen.
 */
export function replaceSearchParams(
  update: Record<string, string | null | undefined>,
): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(update)) {
    if (value == null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  if (url.href !== window.location.href) {
    window.history.replaceState(null, "", url);
  }
}

/** Mirrors `values` into the query string whenever they change. */
export function useSyncSearchParams(
  values: Record<string, string | null | undefined>,
  enabled = true,
): void {
  const serialized = JSON.stringify(values);
  const first = useRef(true);
  useEffect(() => {
    // The first render reads *from* the URL; writing back then would only
    // normalise it, which isn't worth a history write.
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled) return;
    replaceSearchParams(JSON.parse(serialized));
  }, [serialized, enabled]);
}
