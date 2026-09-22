"use client";

import { useCallback, useSyncExternalStore } from "react";

export type LiveFontFamily = "sans" | "mono" | "serif";

export const LIVE_FONT_FAMILIES: readonly LiveFontFamily[] = [
  "sans",
  "mono",
  "serif",
];

export interface LiveDisplayPrefs {
  /** Pure black/white with stage-yellow chords, for bright or dim stages. */
  highContrast: boolean;
  /** Whole song on one screen: auto-sized text, no scrolling needed. */
  fitToScreen: boolean;
  /** Typeface of the lyrics. Mono keeps chords aligned on any font stack. */
  fontFamily: LiveFontFamily;
  /** Chords over the lyrics, or lyrics alone (for the singer's screen). */
  showChords: boolean;
  /** Section headings (Verse, Chorus…) and the chorus accent bar. */
  showSections: boolean;
}

const STORAGE_KEY = "setlyst:live-display";
const DEFAULTS: LiveDisplayPrefs = {
  highContrast: false,
  fitToScreen: false,
  fontFamily: "sans",
  // Most people reading Live Mode are singing, not playing: lyrics first,
  // chords one tap away. Sections stay on — they're how you find your
  // place in the song.
  showChords: false,
  showSections: true,
};

/*
 * These live on the device, not on the account: they're about the screen
 * and the stage, not about the person. The phone on the mic stand may
 * want the whole song on one screen while the tablet on the keyboard
 * scrolls, and a dark club and a daylight festival want different
 * contrast. The typeface and chords on/off follow the same logic — the
 * singer's phone wants lyrics only, the guitarist's tablet wants chords.
 * (Font size is on the account because it follows the reader's eyes;
 * these follow the hardware.)
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
      fontFamily: LIVE_FONT_FAMILIES.includes(
        parsed.fontFamily as LiveFontFamily,
      )
        ? (parsed.fontFamily as LiveFontFamily)
        : DEFAULTS.fontFamily,
      showChords: parsed.showChords === true,
      showSections: parsed.showSections !== false,
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

  const toggle = useCallback(
    (key: "highContrast" | "fitToScreen" | "showChords" | "showSections") => {
      const current = read();
      write({ ...current, [key]: !current[key] });
    },
    [],
  );

  return { ...prefs, setPref, toggle };
}
