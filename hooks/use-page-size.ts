"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/ui-settings";

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS };

const STORAGE_KEY = "setlyst:page-size";
const listeners = new Set<() => void>();

/** The account default (Settings → Lists), installed by UiSettingsProvider. */
let accountDefault: number = DEFAULT_PAGE_SIZE;

function isOption(value: number): boolean {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

function read(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return isOption(stored) ? stored : accountDefault;
  } catch {
    return accountDefault;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function setPageSizeAccountDefault(size: number) {
  accountDefault = isOption(size) ? size : DEFAULT_PAGE_SIZE;
  notify();
}

/** Whether this device picked its own page size. */
export function hasPageSizeDeviceOverride(): boolean {
  try {
    return isOption(Number(window.localStorage.getItem(STORAGE_KEY)));
  } catch {
    return false;
  }
}

/** Drops this device's choice so it follows the account default again. */
export function resetPageSizeDeviceOverride() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored anyway.
  }
  notify();
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
 * Rows per page for every list in the app — one preference, so choosing
 * "50" once applies to songs, setlists and artists alike. A choice made in
 * a table is remembered on this device; devices that never picked one
 * follow the account default from Settings.
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
    notify();
  }, []);

  return [pageSize, setPageSize] as const;
}
