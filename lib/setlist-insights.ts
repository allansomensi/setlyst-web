/**
 * Flow analysis of a setlist's running order (SPEC §10.7): the strengths
 * and the points to improve shown on the setlist statistics page.
 *
 * Pure and deterministic: it only reads the running order (songs with
 * their energy, BPM, key and duration, plus blocks and breaks) and
 * returns structured insights. The page translates them into sentences;
 * nothing here is user-visible text.
 *
 * Conventions:
 * - Song indices are 0-based positions among the songs only (blocks and
 *   breaks don't count). `range` is inclusive; the UI shows `index + 1`.
 * - Missing data never counts as evidence: a song without energy or BPM
 *   interrupts a stretch instead of extending it.
 * - A break resets the stretches (the audience rests), a block doesn't
 *   (it is only a label in the running order). Both count as a pause for
 *   BPM jumps, since the band can re-count between them.
 */

import type { SetlistItem } from "@/types/api";

// ---------------------------------------------------------------------
// Thresholds (tuned for typical pop/rock/MPB sets; see the tests)
// ---------------------------------------------------------------------

/** Energy at or below this is "low" (1 = very low, 2 = low). */
export const LOW_ENERGY_MAX = 2;
/** Energy at or above this is "high" (4 = high, 5 = very high). */
export const HIGH_ENERGY_MIN = 4;
/** BPM below this is "slow". */
export const SLOW_BPM_BELOW = 90;
/** BPM at or above this is "fast". */
export const FAST_BPM_MIN = 130;
/** Consecutive slow, low-energy songs that make a dip. */
export const LOW_STRETCH_MIN_SONGS = 3;
/** Consecutive fast, high-energy songs that tire band and audience. */
export const TIRING_STRETCH_MIN_SONGS = 4;
/** BPM difference between neighbours that feels abrupt. */
export const BPM_JUMP_THRESHOLD = 40;
/** A jump this large is a strong warning. */
export const BPM_JUMP_SEVERE = 60;
/** Consecutive songs in the same key that start to sound alike. */
export const SAME_KEY_MIN_SONGS = 4;
/** Minutes of music without a break before the set gets long. */
export const LONG_SET_MINUTES = 60;
/** Minimum songs for the opener/closer rules. */
export const MIN_SONGS_FOR_EDGES = 3;
/** Minimum songs to talk about the arc of the set. */
export const MIN_SONGS_FOR_ARC = 5;
/** Share of songs with energy needed before judging the arc. */
export const MIN_COVERAGE_FOR_ARC = 0.6;
/** Distinct keys that make a varied set. */
export const KEY_VARIETY_MIN_KEYS = 4;
/** BPM spread (max - min) that makes a varied set. */
export const TEMPO_VARIETY_MIN_SPREAD = 50;
/** Songs with key/BPM needed before praising variety. */
export const VARIETY_MIN_SONGS = 5;
/** Missing data at or above this share is a strong warning. */
export const MISSING_DATA_SEVERE_SHARE = 0.5;

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export interface FlowSong {
  kind: "song";
  title: string;
  energy: number | null;
  tempo: number | null;
  tonality: string | null;
  /** Seconds. */
  duration: number | null;
}

export interface FlowBlock {
  kind: "block";
  name: string;
}

export interface FlowBreak {
  kind: "break";
  label: string | null;
  durationMinutes: number | null;
}

export type FlowEntry = FlowSong | FlowBlock | FlowBreak;

export type InsightKind = "strength" | "improvement";
export type InsightSeverity = "low" | "medium" | "high";

export type InsightCode =
  // improvements
  | "low_energy_stretch"
  | "tiring_stretch"
  | "weak_opener"
  | "weak_closer"
  | "bpm_jump"
  | "same_key_run"
  | "long_set_without_break"
  | "missing_data"
  // strengths
  | "strong_opener"
  | "strong_closer"
  | "good_arc"
  | "key_variety"
  | "tempo_variety"
  | "smooth_transitions"
  | "complete_data";

export interface Insight {
  kind: InsightKind;
  code: InsightCode;
  severity: InsightSeverity;
  /** Inclusive 0-based song indices. */
  range: [number, number];
  /** Numbers and strings for the message (counts, BPM, key...). */
  values: Record<string, string | number>;
}

// ---------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------

/** Converts the API's running order into flow entries. */
export function entriesFromItems(items: SetlistItem[]): FlowEntry[] {
  return items.map((item): FlowEntry => {
    if (item.item_type === "song") {
      return {
        kind: "song",
        title: item.song.title,
        energy: item.song.energy ?? null,
        tempo: item.song.tempo ?? null,
        tonality: item.song.tonality ?? null,
        duration: item.song.duration ?? null,
      };
    }
    if (item.item_type === "block") return { kind: "block", name: item.name };
    return {
      kind: "break",
      label: item.label,
      durationMinutes: item.duration_minutes,
    };
  });
}

/** The songs only, in order. */
export function songsOf(entries: FlowEntry[]): FlowSong[] {
  return entries.filter((e): e is FlowSong => e.kind === "song");
}

interface IndexedSong extends FlowSong {
  index: number;
  /** A break comes right before this song. */
  afterBreak: boolean;
  /** A block or break comes right before this song. */
  afterMarker: boolean;
}

function indexSongs(entries: FlowEntry[]): IndexedSong[] {
  const result: IndexedSong[] = [];
  let afterBreak = false;
  let afterMarker = false;
  for (const entry of entries) {
    if (entry.kind === "song") {
      result.push({ ...entry, index: result.length, afterBreak, afterMarker });
      afterBreak = false;
      afterMarker = false;
    } else {
      afterMarker = true;
      if (entry.kind === "break") afterBreak = true;
    }
  }
  return result;
}

const isKnown = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

// ---------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------

/**
 * Maximal runs of consecutive songs matching `predicate`, split by breaks.
 * Returns `[start, end]` index pairs of runs at least `minLength` long.
 */
function runs(
  songs: IndexedSong[],
  predicate: (song: IndexedSong) => boolean,
  minLength: number,
): [number, number][] {
  const found: [number, number][] = [];
  let start = -1;
  const close = (end: number) => {
    if (start >= 0 && end - start + 1 >= minLength) found.push([start, end]);
    start = -1;
  };
  for (const song of songs) {
    if (song.afterBreak) close(song.index - 1);
    if (predicate(song)) {
      if (start < 0) start = song.index;
    } else {
      close(song.index - 1);
    }
  }
  close(songs.length - 1);
  return found;
}

function stretchRules(songs: IndexedSong[]): Insight[] {
  const insights: Insight[] = [];

  for (const [start, end] of runs(
    songs,
    (s) =>
      isKnown(s.energy) &&
      s.energy <= LOW_ENERGY_MAX &&
      isKnown(s.tempo) &&
      s.tempo < SLOW_BPM_BELOW,
    LOW_STRETCH_MIN_SONGS,
  )) {
    const count = end - start + 1;
    insights.push({
      kind: "improvement",
      code: "low_energy_stretch",
      severity: count >= LOW_STRETCH_MIN_SONGS + 2 ? "high" : "medium",
      range: [start, end],
      values: { count },
    });
  }

  for (const [start, end] of runs(
    songs,
    (s) =>
      isKnown(s.energy) &&
      s.energy >= HIGH_ENERGY_MIN &&
      isKnown(s.tempo) &&
      s.tempo >= FAST_BPM_MIN,
    TIRING_STRETCH_MIN_SONGS,
  )) {
    const count = end - start + 1;
    insights.push({
      kind: "improvement",
      code: "tiring_stretch",
      severity: count >= TIRING_STRETCH_MIN_SONGS + 2 ? "high" : "medium",
      range: [start, end],
      values: { count },
    });
  }

  for (const [start, end] of runs(
    songs,
    (s) => !!s.tonality,
    SAME_KEY_MIN_SONGS,
  )) {
    // Split the "has a key" run into same-key runs.
    let runStart = start;
    for (let i = start + 1; i <= end + 1; i++) {
      if (i > end || songs[i].tonality !== songs[runStart].tonality) {
        const count = i - runStart;
        if (count >= SAME_KEY_MIN_SONGS) {
          insights.push({
            kind: "improvement",
            code: "same_key_run",
            severity: count >= SAME_KEY_MIN_SONGS + 2 ? "medium" : "low",
            range: [runStart, i - 1],
            values: { count, key: songs[runStart].tonality ?? "" },
          });
        }
        runStart = i;
      }
    }
  }

  return insights;
}

function edgeRules(songs: IndexedSong[]): Insight[] {
  if (songs.length < MIN_SONGS_FOR_EDGES) return [];
  const insights: Insight[] = [];
  const first = songs[0];
  const last = songs[songs.length - 1];

  if (isKnown(first.energy)) {
    if (first.energy <= LOW_ENERGY_MAX) {
      insights.push({
        kind: "improvement",
        code: "weak_opener",
        severity: "medium",
        range: [0, 0],
        values: { energy: first.energy },
      });
    } else if (first.energy >= HIGH_ENERGY_MIN) {
      insights.push({
        kind: "strength",
        code: "strong_opener",
        severity: "low",
        range: [0, 0],
        values: { energy: first.energy },
      });
    }
  }

  if (isKnown(last.energy)) {
    if (last.energy <= LOW_ENERGY_MAX) {
      insights.push({
        kind: "improvement",
        code: "weak_closer",
        severity: "medium",
        range: [last.index, last.index],
        values: { energy: last.energy },
      });
    } else if (last.energy >= HIGH_ENERGY_MIN) {
      insights.push({
        kind: "strength",
        code: "strong_closer",
        severity: "low",
        range: [last.index, last.index],
        values: { energy: last.energy },
      });
    }
  }

  return insights;
}

function jumpRules(songs: IndexedSong[]): Insight[] {
  const insights: Insight[] = [];
  let comparable = 0;
  for (let i = 1; i < songs.length; i++) {
    const prev = songs[i - 1];
    const next = songs[i];
    if (!isKnown(prev.tempo) || !isKnown(next.tempo)) continue;
    // A block or a break is a natural place to change the pulse.
    if (next.afterMarker) continue;
    comparable += 1;
    const delta = Math.abs(next.tempo - prev.tempo);
    if (delta > BPM_JUMP_THRESHOLD) {
      insights.push({
        kind: "improvement",
        code: "bpm_jump",
        severity: delta > BPM_JUMP_SEVERE ? "medium" : "low",
        range: [prev.index, next.index],
        values: { from: prev.tempo, to: next.tempo, delta },
      });
    }
  }

  const withTempo = songs.filter((s) => isKnown(s.tempo)).length;
  if (
    insights.length === 0 &&
    withTempo >= VARIETY_MIN_SONGS &&
    comparable >= VARIETY_MIN_SONGS - 1
  ) {
    insights.push({
      kind: "strength",
      code: "smooth_transitions",
      severity: "low",
      range: [0, songs.length - 1],
      values: { count: withTempo },
    });
  }
  return insights;
}

function longSetRule(songs: IndexedSong[]): Insight[] {
  const insights: Insight[] = [];
  let start = 0;
  let seconds = 0;
  const close = (end: number) => {
    const minutes = Math.round(seconds / 60);
    if (seconds > LONG_SET_MINUTES * 60 && end >= start) {
      insights.push({
        kind: "improvement",
        code: "long_set_without_break",
        severity: seconds > LONG_SET_MINUTES * 60 * 1.5 ? "high" : "medium",
        range: [start, end],
        values: { minutes },
      });
    }
  };
  for (const song of songs) {
    if (song.afterBreak) {
      close(song.index - 1);
      start = song.index;
      seconds = 0;
    }
    if (isKnown(song.duration) && song.duration > 0) seconds += song.duration;
  }
  close(songs.length - 1);
  return insights;
}

function coverageRules(songs: IndexedSong[]): Insight[] {
  const total = songs.length;
  if (total === 0) return [];
  const missingEnergy = songs.filter((s) => !isKnown(s.energy)).length;
  const missingTempo = songs.filter((s) => !isKnown(s.tempo)).length;
  const missingAny = songs.filter(
    (s) => !isKnown(s.energy) || !isKnown(s.tempo),
  ).length;

  if (missingAny === 0) {
    return total >= MIN_SONGS_FOR_EDGES
      ? [
          {
            kind: "strength",
            code: "complete_data",
            severity: "low",
            range: [0, total - 1],
            values: { total },
          },
        ]
      : [];
  }

  const share = missingAny / total;
  return [
    {
      kind: "improvement",
      code: "missing_data",
      severity: share >= MISSING_DATA_SEVERE_SHARE ? "high" : "low",
      range: [0, total - 1],
      values: {
        missing: missingAny,
        missingEnergy,
        missingTempo,
        total,
        percent: Math.round(share * 100),
      },
    },
  ];
}

function arcRule(songs: IndexedSong[]): Insight[] {
  const total = songs.length;
  if (total < MIN_SONGS_FOR_ARC) return [];
  const withEnergy = songs.filter((s) => isKnown(s.energy));
  if (withEnergy.length / total < MIN_COVERAGE_FOR_ARC) return [];

  const peakEnergy = Math.max(...withEnergy.map((s) => s.energy as number));
  // The last time the set reaches its peak.
  const peak = [...withEnergy]
    .reverse()
    .find((s) => s.energy === peakEnergy) as IndexedSong;
  const lastThirdStart = Math.floor((total * 2) / 3);

  const avg = (list: IndexedSong[]) => {
    const known = list.filter((s) => isKnown(s.energy));
    return known.length
      ? known.reduce((sum, s) => sum + (s.energy as number), 0) / known.length
      : null;
  };
  const third = Math.max(1, Math.floor(total / 3));
  const opening = avg(songs.slice(0, third));
  const ending = avg(songs.slice(total - third));

  if (
    peak.index >= lastThirdStart &&
    opening !== null &&
    ending !== null &&
    ending > opening
  ) {
    return [
      {
        kind: "strength",
        code: "good_arc",
        severity: "low",
        range: [peak.index, peak.index],
        values: { peak: peak.index, energy: peakEnergy },
      },
    ];
  }
  return [];
}

function varietyRules(songs: IndexedSong[]): Insight[] {
  const insights: Insight[] = [];
  const keys = songs.map((s) => s.tonality).filter((k): k is string => !!k);
  const distinct = new Set(keys).size;
  if (keys.length >= VARIETY_MIN_SONGS && distinct >= KEY_VARIETY_MIN_KEYS) {
    insights.push({
      kind: "strength",
      code: "key_variety",
      severity: "low",
      range: [0, songs.length - 1],
      values: { count: distinct },
    });
  }

  const tempos = songs.map((s) => s.tempo).filter(isKnown);
  if (tempos.length >= VARIETY_MIN_SONGS) {
    const min = Math.min(...tempos);
    const max = Math.max(...tempos);
    if (max - min >= TEMPO_VARIETY_MIN_SPREAD) {
      insights.push({
        kind: "strength",
        code: "tempo_variety",
        severity: "low",
        range: [0, songs.length - 1],
        values: { min, max },
      });
    }
  }
  return insights;
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Every insight for a running order: points to improve first (most
 * severe, then earliest), strengths after (in set order).
 */
export function analyzeSetlist(entries: FlowEntry[]): Insight[] {
  const songs = indexSongs(entries);
  if (songs.length === 0) return [];

  const all = [
    ...coverageRules(songs),
    ...edgeRules(songs),
    ...stretchRules(songs),
    ...jumpRules(songs),
    ...longSetRule(songs),
    ...arcRule(songs),
    ...varietyRules(songs),
  ];

  const improvements = all
    .filter((i) => i.kind === "improvement")
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.range[0] - b.range[0],
    );
  const strengths = all
    .filter((i) => i.kind === "strength")
    .sort((a, b) => a.range[0] - b.range[0]);
  return [...improvements, ...strengths];
}

// ---------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------

export interface KeyChange {
  /** Song index where the key changes (0 = the first key). */
  index: number;
  key: string;
}

/** The key of the first song and every change after it. */
export function keyChanges(entries: FlowEntry[]): KeyChange[] {
  const changes: KeyChange[] = [];
  let current: string | null = null;
  songsOf(entries).forEach((song, index) => {
    if (song.tonality && song.tonality !== current) {
      changes.push({ index, key: song.tonality });
      current = song.tonality;
    }
  });
  return changes;
}

export interface BlockDuration {
  /** The block's name, `null` for songs before the first block. */
  name: string | null;
  songCount: number;
  /** Known song durations, in seconds. */
  seconds: number;
  /** Songs in the block without a duration. */
  missing: number;
}

/** Music time per block (breaks excluded). */
export function blockDurations(entries: FlowEntry[]): BlockDuration[] {
  const blocks: BlockDuration[] = [];
  let current: BlockDuration = {
    name: null,
    songCount: 0,
    seconds: 0,
    missing: 0,
  };
  for (const entry of entries) {
    if (entry.kind === "block") {
      if (current.songCount > 0 || current.name !== null) blocks.push(current);
      current = { name: entry.name, songCount: 0, seconds: 0, missing: 0 };
    } else if (entry.kind === "song") {
      current.songCount += 1;
      if (isKnown(entry.duration) && entry.duration > 0) {
        current.seconds += entry.duration;
      } else {
        current.missing += 1;
      }
    }
  }
  if (current.songCount > 0 || current.name !== null) blocks.push(current);
  return blocks;
}

export interface Coverage {
  total: number;
  energy: number;
  tempo: number;
  key: number;
  duration: number;
}

/** How many songs have each field filled in. */
export function dataCoverage(entries: FlowEntry[]): Coverage {
  const songs = songsOf(entries);
  return {
    total: songs.length,
    energy: songs.filter((s) => isKnown(s.energy)).length,
    tempo: songs.filter((s) => isKnown(s.tempo)).length,
    key: songs.filter((s) => !!s.tonality).length,
    duration: songs.filter((s) => isKnown(s.duration) && s.duration > 0).length,
  };
}
