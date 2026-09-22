"use client";

import { useCallback, useState } from "react";
import { DEFAULT_BPM, clampBpm } from "@/hooks/use-metronome";

const DEFAULT_BEATS_PER_BAR = 4;

export interface MetronomeSettings {
  isRunning: boolean;
  toggleRunning: () => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  /** True when the tempo shown came from the song rather than being dialled in. */
  isSongTempo: boolean;
  beatsPerBar: number;
  setBeatsPerBar: (beats: number) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
}

/**
 * Session state for the Live Mode metronome, separate from the timing
 * engine in use-metronome.ts.
 *
 * The interesting part is how tempo follows the running order. Each song
 * carries its own stored BPM, so moving to the next song should retune the
 * metronome automatically — that is the whole point of having it here
 * rather than on a separate device. But a tempo dialled in by hand for the
 * song currently on screen must survive until the song actually changes.
 *
 * So the manual value is stored *tagged with the song it was set for*, and
 * simply stops applying once a different song is showing. That makes the
 * reset fall out of a derived comparison instead of needing an effect that
 * watches the song id and writes state — which would render one frame with
 * the previous song's tempo before correcting itself, audible as a stumble
 * at exactly the moment the next song starts.
 *
 * Nothing here is persisted: a tempo typed in for one performance should
 * not quietly reappear at the next one.
 */
export function useMetronomeSettings(
  songId: string | undefined,
  songTempo: number | null | undefined,
): MetronomeSettings {
  const [isRunning, setIsRunning] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(DEFAULT_BEATS_PER_BAR);
  // Off by default: on stage the useful metronome is a silent one, and a
  // click nobody asked for coming out of a phone during a quiet number is
  // worse than no metronome at all.
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [override, setOverride] = useState<{
    songId: string | undefined;
    bpm: number;
  } | null>(null);

  const storedBpm =
    typeof songTempo === "number" && songTempo > 0 ? clampBpm(songTempo) : null;

  const hasOverride = override !== null && override.songId === songId;
  const bpm = hasOverride ? override.bpm : (storedBpm ?? DEFAULT_BPM);
  const isSongTempo = !hasOverride && storedBpm !== null;

  const setBpm = useCallback(
    (next: number) => setOverride({ songId, bpm: clampBpm(next) }),
    [songId],
  );

  const toggleRunning = useCallback(() => setIsRunning((value) => !value), []);

  return {
    isRunning,
    toggleRunning,
    bpm,
    setBpm,
    isSongTempo,
    beatsPerBar,
    setBeatsPerBar,
    audioEnabled,
    setAudioEnabled,
  };
}
