"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server rendering and hydration, true afterwards.
 *
 * For output that depends on the viewer's clock, time zone or locale
 * settings (relative dates, "upcoming" vs "past"): rendering it only after
 * mount keeps the server HTML and the first client render identical, so
 * React never has to throw the markup away over a hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
