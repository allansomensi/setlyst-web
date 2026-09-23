"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_LIVE,
  LIVE_FONT_FAMILIES,
  normalizeLiveDefaults,
  type LiveDefaults,
  type LiveFontFamily,
} from "@/lib/ui-settings";

export { LIVE_FONT_FAMILIES, type LiveFontFamily };

export type LiveDisplayPrefs = LiveDefaults;

const STORAGE_KEY = "setlyst:live-display";

/*
 * Two layers:
 *
 * - **Account defaults** (Settings → Live Mode), saved on the account so
 *   every device starts the same way. Installed here by
 *   `UiSettingsProvider` via `setLiveAccountDefaults`.
 * - **Device overrides**, written whenever the quick toggles in Live Mode
 *   are used. They're about the screen and the stage, not the person: the
 *   phone on the mic stand may want the whole song on one screen while
 *   the tablet on the keyboard scrolls with chords. A device with no
 *   override simply follows the account defaults.
 *
 * Read through useSyncExternalStore so the server render and the first
 * client render agree (no hydration mismatch). Every mounted viewer
 * shares one snapshot, and a change in another tab applies via `storage`.
 */

const listeners = new Set<() => void>();
let accountDefaults: LiveDefaults = DEFAULT_LIVE;
let cached: LiveDisplayPrefs | null = null;

function notify() {
  listeners.forEach((l) => l());
}

function readOverride(): Partial<LiveDisplayPrefs> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<LiveDisplayPrefs>) : null;
  } catch {
    // Private mode, blocked storage, corrupt JSON: no override.
    return null;
  }
}

function read(): LiveDisplayPrefs {
  if (cached) return cached;
  const override = readOverride();
  cached = override
    ? normalizeLiveDefaults({ ...accountDefaults, ...override })
    : accountDefaults;
  return cached;
}

function write(next: LiveDisplayPrefs) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Still applied for this session; it just won't be remembered.
  }
  notify();
}

/** Installs the account's saved defaults (see UiSettingsProvider). */
export function setLiveAccountDefaults(defaults: LiveDefaults) {
  accountDefaults = normalizeLiveDefaults(defaults);
  cached = null;
  notify();
}

/** Whether this device has its own Live Mode choices. */
export function hasLiveDeviceOverride(): boolean {
  return readOverride() !== null;
}

/** Drops this device's choices so it follows the account defaults again. */
export function resetLiveDeviceOverride() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored anyway.
  }
  cached = null;
  notify();
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

const getServerSnapshot = () => DEFAULT_LIVE;

export function useLiveDisplayPrefs() {
  const prefs = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const setPref = useCallback(
    <K extends keyof LiveDisplayPrefs>(key: K, value: LiveDisplayPrefs[K]) => {
      write({ ...read(), [key]: value });
    },
    [],
  );

  const toggle = useCallback(
    (key: "highContrast" | "fitToScreen" | "showChords" | "showSections") => {
      const current = read();
      write({ ...current, [key]: !current[key] });
    },
    [],
  );

  return { ...prefs, setPref, toggle };
}
