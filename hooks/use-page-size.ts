"use client";

import { useCallback, useSyncExternalStore } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

const STORAGE_KEY = "setlyst:page-size";
const listeners = new Set<() => void>();

function read(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(stored)
      ? stored
      : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Rows per page for every list in the app — one preference, remembered on
 * this device, so choosing "50" once applies to songs, setlists and
 * artists alike. Read through useSyncExternalStore so the server render
 * (default) and the stored value never cause a hydration mismatch.
 */
export function usePageSize() {
  const pageSize = useSyncExternalStore(
    subscribe,
    read,
    () => DEFAULT_PAGE_SIZE,
  );

  const setPageSize = useCallback((next: number) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Applied for this session only.
    }
    listeners.forEach((l) => l());
  }, []);

  return [pageSize, setPageSize] as const;
}
