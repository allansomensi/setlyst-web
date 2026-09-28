"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import {
  DEFAULT_CHORD_DIAGRAMS,
  normalizeChordDiagrams,
  type ChordDiagramSettings,
} from "@/lib/ui-settings";
import { toastActionError } from "@/lib/action-toast";

const STORAGE_KEY = "setlyst:chord-diagrams";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: ChordDiagramSettings = DEFAULT_CHORD_DIAGRAMS;

function readLocal(): ChordDiagramSettings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the defaults.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = normalizeChordDiagrams(raw ? JSON.parse(raw) : null);
    } catch {
      cached = DEFAULT_CHORD_DIAGRAMS;
    }
  }
  return cached;
}

function writeLocal(value: ChordDiagramSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Not persisted; still applied for this page view.
  }
  cachedRaw = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The chord-diagram preferences (instrument, left-handed).
 *
 * Signed in, they are the account's UI settings — the same instrument on
 * every device, and a change made from a diagram is saved there. On
 * public pages (a shared setlist), where there is no account, they live
 * in this browser.
 */
export function useChordDiagramPrefs(): [
  ChordDiagramSettings,
  (patch: Partial<ChordDiagramSettings>) => void,
] {
  const { settings, persisted, update } = useUiSettings();
  const local = useSyncExternalStore(
    subscribe,
    readLocal,
    () => DEFAULT_CHORD_DIAGRAMS,
  );
  const prefs = persisted ? settings.chords : local;

  const set = useCallback(
    (patch: Partial<ChordDiagramSettings>) => {
      const next = { ...prefs, ...patch };
      if (!persisted) {
        writeLocal(next);
        return;
      }
      void update({ chords: next }).then((result) => {
        if (!result.success) toastActionError(result, result.error);
      });
    },
    [prefs, persisted, update],
  );

  return [prefs, set];
}
