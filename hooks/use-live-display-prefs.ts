"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface LiveDisplayPrefs {
  /** Pure black/white with stage-yellow chords, for bright or dim stages. */
  highContrast: boolean;
  /** Whole song on one screen: auto-sized text, no scrolling needed. */
  fitToScreen: boolean;
}

const STORAGE_KEY = "setlyst:live-display";
const DEFAULTS: LiveDisplayPrefs = { highContrast: false, fitToScreen: false };

/*
 * These live on the device, not on the account: they're about the screen
 * and the stage, not about the person. The phone on the mic stand may
 * want the whole song on one screen while the tablet on the keyboard
 * scrolls, and a dark club and a daylight festival want different
 * contrast. (Font size is on the account because it follows the reader's
 * eyes; these follow the hardware.)
 *
 * Read through useSyncExternalStore so the server render and the first
 * client render agree on the defaults (no hydration mismatch), after which
 * the stored value takes over. Every mounted viewer shares one snapshot,
 * and a change in another tab applies here too via the `storage` event.
 */

const listeners = new Set<() => void>();
let cached: LiveDisplayPrefs | null = null;

function read(): LiveDisplayPrefs {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<LiveDisplayPrefs>) : {};
    cached = {
      highContrast: parsed.highContrast === true,
      fitToScreen: parsed.fitToScreen === true,
    };
  } catch {
    // Private mode, blocked storage, corrupt JSON: fall back to defaults
    // rather than taking Live Mode down over a display preference.
    cached = DEFAULTS;
  }
  return cached;
}

function write(next: LiveDisplayPrefs) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Still applied for this session; it just won't be remembered.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cached = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => DEFAULTS;

export function useLiveDisplayPrefs() {
  const prefs = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const setPref = useCallback(
    <K extends keyof LiveDisplayPrefs>(key: K, value: LiveDisplayPrefs[K]) => {
      write({ ...read(), [key]: value });
    },
    [],
  );

  const toggle = useCallback((key: keyof LiveDisplayPrefs) => {
    const current = read();
    write({ ...current, [key]: !current[key] });
  }, []);

  return { ...prefs, setPref, toggle };
}
