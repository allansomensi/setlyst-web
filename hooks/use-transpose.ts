"use client";

import { useCallback, useMemo, useState } from "react";
import {
  findFirstChord,
  shouldPreferFlats,
  transposeChordPro,
  transposeKey,
} from "@/lib/music/chords";
import { normalizeChordPro } from "@/lib/music/chordpro";

/**
 * An octave either way is the whole useful range: twelve semitones lands
 * back on the same chord names, so anything beyond this is a longer way of
 * asking for less.
 */
export const MAX_TRANSPOSE = 11;

export interface Transpose {
  /** Semitones away from the written key. 0 means untransposed. */
  semitones: number;
  shift: (delta: number) => void;
  reset: () => void;
  /** The lyrics with every chord rewritten. Identical to the input at 0. */
  content: string;
  /** The key now being played, for display. Null if the song has none stored. */
  key: string | null;
  /**
   * Where a guitarist would clamp a capo to play these shapes and still
   * sound in the song's original key. Only meaningful when transposed
   * down — a capo can raise pitch, never lower it — so it is null
   * otherwise rather than inventing an impossible instruction.
   */
  capoFret: number | null;
}

/**
 * Live transposition for the song on screen.
 *
 * The offset is tagged with the song it belongs to and stops applying once
 * a different song is showing, exactly as the metronome's manual tempo
 * does. A key change is a decision about *this* song — carrying it into
 * the next one would silently put the rest of the set in the wrong key,
 * which is far worse than having to ask for it again.
 *
 * Deriving the reset from that comparison, rather than watching the song
 * id in an effect, also means the new song's first render is already in
 * its own key. An effect would paint one frame of the next song still
 * transposed by the previous song's offset.
 */
export function useTranspose(
  songId: string | undefined,
  tonality: string | null | undefined,
  rawLyrics: string,
): Transpose {
  // Chords written above the lyrics (the usual layout of pasted charts)
  // become inline ChordPro first — otherwise they're plain text, and
  // transposing would leave every one of them in the original key.
  const lyrics = useMemo(() => normalizeChordPro(rawLyrics), [rawLyrics]);

  const [offset, setOffset] = useState<{
    songId: string | undefined;
    semitones: number;
  } | null>(null);

  // Guarded on `offset` first, not just on the song ids matching: with no
  // song on screen both ids are `undefined`, and `undefined === undefined`
  // would take the branch that reads through a null offset.
  const semitones =
    offset !== null && offset.songId === songId ? offset.semitones : 0;

  const preferFlats = useMemo(
    () => shouldPreferFlats(tonality, semitones, findFirstChord(lyrics)),
    [tonality, semitones, lyrics],
  );

  const content = useMemo(
    () => transposeChordPro(lyrics, semitones, preferFlats),
    [lyrics, semitones, preferFlats],
  );

  const key = useMemo(
    () => transposeKey(tonality, semitones) ?? tonality ?? null,
    [tonality, semitones],
  );

  const shift = useCallback(
    (delta: number) =>
      setOffset((previous) => {
        const current =
          previous !== null && previous.songId === songId
            ? previous.semitones
            : 0;
        const next = Math.max(
          -MAX_TRANSPOSE,
          Math.min(MAX_TRANSPOSE, current + delta),
        );
        return { songId, semitones: next };
      }),
    [songId],
  );

  const reset = useCallback(
    () => setOffset({ songId, semitones: 0 }),
    [songId],
  );

  return {
    semitones,
    shift,
    reset,
    content,
    key,
    capoFret: semitones < 0 ? -semitones : null,
  };
}
