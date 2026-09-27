"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "setlyst:live-scroll-collapsed";

const listeners = new Set<() => void>();
/** Used when storage is blocked, so a choice still applies this session. */
let memory = false;

function read(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return raw === "1";
  } catch {
    // Blocked storage: fall back to this session's choice.
  }
  return memory;
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
 * Whether Live Mode's floating auto-scroll pill is folded down to its pause
 * button, per device: a phone wants the lyrics clear, a tablet has room.
 */
export function useLiveScrollCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);

  const setCollapsed = useCallback((next: boolean) => {
    memory = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Applies to this session only.
    }
    listeners.forEach((l) => l());
  }, []);

  return [collapsed, setCollapsed] as const;
}
