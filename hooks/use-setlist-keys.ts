"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setSetlistSongKey } from "@/app/[locale]/dashboard/setlists/actions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { clampTranspose } from "@/hooks/use-transpose";
import type { SetlistSong } from "@/types/api";

/** How long a key has to stay put before it is saved. */
const SAVE_DELAY_MS = 800;

export type SetlistKeyStatus =
  /** The key on screen is the one saved in the setlist. */
  | "saved"
  /** Changed here, on its way to the setlist. */
  | "saving"
  /** Changed here and kept for this session only (read-only or offline). */
  | "local";

export interface SetlistKeys {
  /** Semitones from the written key the song is played in. */
  semitonesFor: (songId: string) => number;
  set: (songId: string, semitones: number) => void;
  statusFor: (songId: string) => SetlistKeyStatus;
}

/**
 * The key each song of a setlist is played in, as Live Mode moves through
 * it.
 *
 * Every song starts in the key saved in the setlist (`transpose`). A change
 * made on stage belongs to that song: it stays when moving to the next
 * song and back, and — when the person may edit the setlist — it is saved
 * to the setlist after a short pause, so the next time the set is opened
 * the song is already in the singer's key. Offline, changes wait and are
 * saved once the connection returns; without permission to edit the
 * setlist they are kept for the rest of the session.
 */
export function useSetlistKeys(
  setlistId: string,
  songs: SetlistSong[],
  canSave: boolean,
): SetlistKeys {
  const isOnline = useOnlineStatus();

  const saved = useMemo(
    () => new Map(songs.map((song) => [song.id, song.transpose ?? 0])),
    [songs],
  );
  // Keys changed on this screen, by song. They win over `saved` until the
  // refreshed setlist carries them.
  const [changed, setChanged] = useState<Record<string, number>>({});
  // Waiting to be saved (debounced, or offline).
  const pending = useRef(new Map<string, number>());
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const timer = useRef<number | null>(null);
  const [refused, setRefused] = useState(false);
  const saveAllowed = canSave && !refused;

  const flush = useCallback(async () => {
    if (!saveAllowed || !navigator.onLine) return;
    const batch = [...pending.current];
    pending.current.clear();
    for (const [songId, semitones] of batch) {
      const result = await setSetlistSongKey(setlistId, songId, semitones);
      if (result.success) {
        setSaving((previous) => ({ ...previous, [songId]: false }));
        continue;
      }
      if (result.code === "rate_limited" || !navigator.onLine) {
        // Tried again with the next change or when back online.
        if (!pending.current.has(songId)) {
          pending.current.set(songId, semitones);
        }
        continue;
      }
      // Not allowed (or the song left the setlist): keep it on screen for
      // this session and stop trying.
      setRefused(true);
      setSaving({});
      pending.current.clear();
      return;
    }
  }, [saveAllowed, setlistId]);

  const set = useCallback(
    (songId: string, semitones: number) => {
      const value = clampTranspose(semitones);
      setChanged((previous) => ({ ...previous, [songId]: value }));
      if (!saveAllowed) return;
      pending.current.set(songId, value);
      setSaving((previous) => ({ ...previous, [songId]: true }));
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void flush();
      }, SAVE_DELAY_MS);
    },
    [saveAllowed, flush],
  );

  // Back online: save what changed meanwhile.
  useEffect(() => {
    if (isOnline && pending.current.size > 0) void flush();
  }, [isOnline, flush]);

  // Leaving Live Mode right after a change still saves it.
  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        void flush();
      }
    },
    [flush],
  );

  const semitonesFor = useCallback(
    (songId: string) => changed[songId] ?? saved.get(songId) ?? 0,
    [changed, saved],
  );

  const statusFor = useCallback(
    (songId: string): SetlistKeyStatus => {
      if (!(songId in changed)) return "saved";
      if (!saveAllowed) return "local";
      if (saving[songId]) return isOnline ? "saving" : "local";
      return "saved";
    },
    [changed, saveAllowed, saving, isOnline],
  );

  return { semitonesFor, set, statusFor };
}
