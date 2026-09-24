"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { LivePageTurnMode } from "@/hooks/use-live-controls";

const STORAGE_KEY = "setlyst:live-page-turn";

/**
 * Turning the page within a long song before moving on is what a
 * page-turner pedal is for; on a song that already fits the screen the two
 * modes behave the same, so it is the safe default.
 */
export const DEFAULT_PAGE_TURN: LivePageTurnMode = "page";

const listeners = new Set<() => void>();
/** Used when storage is blocked, so a choice still applies this session. */
let memory: LivePageTurnMode | null = null;

function read(): LivePageTurnMode {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "song" || raw === "page") return raw;
  } catch {
    // Blocked storage: fall back to this session's choice.
  }
  return memory ?? DEFAULT_PAGE_TURN;
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
 * What PageDown/PageUp do in setlist Live Mode, per device: it's about the
 * pedal plugged into this tablet, not the account.
 */
export function useLivePageTurn() {
  const mode = useSyncExternalStore(subscribe, read, () => DEFAULT_PAGE_TURN);

  const setMode = useCallback((next: LivePageTurnMode) => {
    memory = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Applies to this session only.
    }
    listeners.forEach((l) => l());
  }, []);

  return [mode, setMode] as const;
}
