"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Small, per-device facts the first-run checklist on the dashboard home
 * needs and the API doesn't know: whether Live Mode has been opened here,
 * and whether the checklist was dismissed.
 */

const LIVE_OPENED_KEY = "setlyst:onboarding:live-opened";
const DISMISSED_KEY = "setlyst:onboarding:dismissed";
const EVENT = "setlyst:onboarding";

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function write(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Not remembered on this device; harmless.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Called by both Live Mode viewers when they open. */
export function markLiveModeOpened() {
  if (!read(LIVE_OPENED_KEY)) write(LIVE_OPENED_KEY);
}

/**
 * `null` until mounted (the server can't know), so nothing flashes in and
 * out during hydration.
 */
export function useOnboardingFlags() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${read(LIVE_OPENED_KEY) ? 1 : 0}${read(DISMISSED_KEY) ? 1 : 0}`,
    () => null,
  );
  const dismiss = useCallback(() => write(DISMISSED_KEY), []);
  if (snapshot === null) return null;
  return {
    liveOpened: snapshot[0] === "1",
    dismissed: snapshot[1] === "1",
    dismiss,
  };
}
