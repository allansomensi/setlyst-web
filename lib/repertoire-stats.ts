/**
 * Repertoire breakdowns for the statistics page, computed from the song
 * list (the metrics endpoint only has totals and top genres/artists).
 * Pure; see lib/__tests__/repertoire-stats.test.ts.
 */

import type { Song } from "@/types/api";

/** BPM ranges: [label key, min inclusive, max exclusive]. */
export const BPM_RANGES = [
  ["under70", 0, 70],
  ["70to89", 70, 90],
  ["90to109", 90, 110],
  ["110to129", 110, 130],
  ["130to149", 130, 150],
  ["150plus", 150, Number.POSITIVE_INFINITY],
] as const;

export type BpmRangeKey = (typeof BPM_RANGES)[number][0];

export interface CountRow<K extends string | number = string> {
  key: K;
  count: number;
}

export interface RepertoireStats {
  totalSongs: number;
  /** Seconds, songs with a duration only. */
  totalDuration: number;
  averageBpm: number | null;
  averageEnergy: number | null;
  keys: CountRow[];
  bpmRanges: CountRow<BpmRangeKey>[];
  energy: CountRow<number>[];
  genres: CountRow[];
  artists: CountRow[];
  coverage: {
    lyrics: number;
    key: number;
    bpm: number;
    energy: number;
    duration: number;
    timeSignature: number;
    links: number;
  };
  /** Songs missing each field, by count. */
  missing: { key: number; bpm: number; energy: number };
}

function countBy<T>(items: T[], keyOf: (item: T) => string | null): CountRow[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

const known = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function repertoireStats(
  songs: Song[],
  artistNames: Map<string, string>,
): RepertoireStats {
  const tempos = songs.map((s) => s.tempo).filter(known);
  const energies = songs.map((s) => s.energy).filter(known);
  const average = (values: number[]) =>
    values.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) /
        10
      : null;

  return {
    totalSongs: songs.length,
    totalDuration: songs.reduce(
      (sum, s) => sum + (known(s.duration) && s.duration > 0 ? s.duration : 0),
      0,
    ),
    averageBpm: tempos.length ? Math.round(average(tempos) as number) : null,
    averageEnergy: average(energies),
    keys: countBy(songs, (s) => s.tonality ?? null),
    bpmRanges: BPM_RANGES.map(([key, min, max]) => ({
      key,
      count: tempos.filter((t) => t >= min && t < max).length,
    })),
    energy: [1, 2, 3, 4, 5].map((level) => ({
      key: level,
      count: energies.filter((e) => e === level).length,
    })),
    genres: countBy(songs, (s) => s.genre ?? null),
    artists: countBy(songs, (s) => artistNames.get(s.artist_id) ?? null),
    coverage: {
      lyrics: songs.filter((s) => !!s.lyrics?.trim()).length,
      key: songs.filter((s) => !!s.tonality).length,
      bpm: tempos.length,
      energy: energies.length,
      duration: songs.filter((s) => known(s.duration) && s.duration > 0).length,
      timeSignature: songs.filter((s) => !!s.time_signature).length,
      links: songs.filter((s) => (s.links?.length ?? 0) > 0).length,
    },
    missing: {
      key: songs.filter((s) => !s.tonality).length,
      bpm: songs.length - tempos.length,
      energy: songs.length - energies.length,
    },
  };
}
