/**
 * Manual harmonic analysis, in the Brazilian harmony-book tradition.
 *
 * A musician writes the analysis of a song by hand, over its chart: the
 * degree of each chord in the key (IIm7, V7/IV, SubV7/II, bVII7), its
 * harmonic function (T, SD, D), marks such as AEM for modal borrowing,
 * the arrows of resolution (solid for a dominant resolving, dashed for a
 * substitute dominant), the brackets of II–V cadences, key changes, and
 * notes on passages. Nothing here classifies or guesses: this module only
 * gives that work a shape, keeps it valid, and keeps it attached to the
 * right chords when the chart is edited later.
 *
 * Pure and framework-free. The API stores the document as an opaque JSON
 * object (see `normalizeAnalysis` for the one place its shape is enforced).
 */

import {
  ANNOTATION_MARK,
  type Block,
  type SectionHeading,
  type SectionKey,
} from "./chordpro";
import { parseChord } from "./chords";

// Vocabulary

export const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
export type Numeral = (typeof NUMERALS)[number];

export const ACCIDENTALS = ["", "b", "#"] as const;
export type Accidental = (typeof ACCIDENTALS)[number];

/** Tonic, subdominant, dominant — the three harmonic functions. */
export const HARMONIC_FUNCTIONS = ["T", "SD", "D"] as const;
export type HarmonicFunction = (typeof HARMONIC_FUNCTIONS)[number];

/**
 * Marks written beside a chord. `aem` is the "acorde de empréstimo
 * modal"; the diminished chords are told apart by how they move
 * (ascending/descending passing, auxiliary).
 */
export const CHORD_BADGES = [
  "aem",
  "dimAsc",
  "dimDesc",
  "dimAux",
  "passing",
  "approach",
  "pedal",
  "cliche",
] as const;
export type ChordBadge = (typeof CHORD_BADGES)[number];

/**
 * The lines drawn between chords. The conventions: a solid arrow for
 * a dominant resolving (V7 → I, V7/II → IIm7), a dashed one for a
 * substitute dominant (SubV7 → I), and a bracket joining the II to the V
 * it prepares (IIm7 – V7) — optionally drawn as a dotted arrow instead
 * (see `AnalysisDisplay.twoFiveStyle`).
 */
export const CONNECTION_KINDS = [
  "dominant",
  "subV",
  "twoFive",
  "deceptive",
  "other",
] as const;
export type ConnectionKind = (typeof CONNECTION_KINDS)[number];

export const NOTE_COLORS = [
  "amber",
  "sky",
  "violet",
  "rose",
  "emerald",
] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

/** Tonalities a key mark can name, as stored on songs. */
export const KEY_NAMES = [
  "C",
  "C#",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
  "Cm",
  "C#m",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Abm",
  "Am",
  "Bbm",
  "Bm",
] as const;

// Document

export interface Degree {
  /** A substitute dominant: "SubV7". */
  sub: boolean;
  accidental: Accidental;
  /** Empty only while being built. */
  numeral: Numeral | "";
  /** Written after the numeral: "7M", "m7", "7", "m7(b5)", "°"... */
  quality: string;
  /** Secondary target, after the slash: "II", "IIm", "IV", "bVI". */
  target: string;
}

export interface ChordEntry {
  degree: Degree | null;
  fn: HarmonicFunction | null;
  badges: ChordBadge[];
  /** A free mark of the musician's own ("Tônica relativa", "Clichê"). */
  custom: string;
  /** A note on this chord, shown as a numbered footnote. */
  note: string;
}

export interface Connection {
  id: string;
  /** Chord indexes (see `buildSheet`). */
  from: number;
  to: number;
  kind: ConnectionKind;
}

export interface KeyMark {
  /** The chord where the key starts. */
  at: number;
  /** "G", "Em", "Bb" (see KEY_NAMES). */
  key: string;
}

export interface RangeNote {
  id: string;
  from: number;
  to: number;
  text: string;
  color: NoteColor;
}

export interface AnalysisDisplay {
  showLyrics: boolean;
  /**
   * The chord symbols over the degrees. Off, the chart reads as degrees
   * alone ("I7M  VIm7  IIm7  V7"), the way it's taught and transposed.
   */
  showChords: boolean;
  /** Colour degrees by function and show the T/SD/D letters. */
  showFunctions: boolean;
  /** II–V drawn as a bracket or as a dotted arrow. */
  twoFiveStyle: "bracket" | "arrow";
}

export interface HarmonicAnalysis {
  schema: 1;
  /**
   * The chart's chord sequence when the analysis was last saved: what
   * `reconcile` re-attaches the analysis by when the chart changes.
   */
  chords: string[];
  /** Keyed by chord index. */
  entries: Record<string, ChordEntry>;
  connections: Connection[];
  keys: KeyMark[];
  notes: RangeNote[];
  /** General commentary: form, style, what makes the harmony tick. */
  summary: string;
  display: AnalysisDisplay;
}

export const LIMITS = {
  quality: 16,
  target: 16,
  custom: 24,
  note: 400,
  rangeNote: 400,
  summary: 4000,
  connections: 600,
  notes: 120,
  keys: 60,
  chords: 2000,
} as const;

export const DEFAULT_DISPLAY: AnalysisDisplay = {
  showLyrics: true,
  showChords: true,
  showFunctions: false,
  twoFiveStyle: "bracket",
};

export function emptyAnalysis(chords: string[] = []): HarmonicAnalysis {
  return {
    schema: 1,
    chords,
    entries: {},
    connections: [],
    keys: [],
    notes: [],
    summary: "",
    display: { ...DEFAULT_DISPLAY },
  };
}

export function emptyEntry(): ChordEntry {
  return { degree: null, fn: null, badges: [], custom: "", note: "" };
}

export function emptyDegree(): Degree {
  return { sub: false, accidental: "", numeral: "", quality: "", target: "" };
}

/** Whether an entry carries anything worth keeping. */
export function entryIsEmpty(entry: ChordEntry | undefined): boolean {
  return (
    !entry ||
    (!degreeIsSet(entry.degree) &&
      !entry.fn &&
      entry.badges.length === 0 &&
      !entry.custom.trim() &&
      !entry.note.trim())
  );
}

export function degreeIsSet(
  degree: Degree | null | undefined,
): degree is Degree {
  return !!degree && !!degree.numeral;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Validation

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return (options as readonly unknown[]).includes(value)
    ? (value as T)
    : fallback;
}

function index(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < LIMITS.chords
    ? value
    : null;
}

function normalizeDegree(raw: unknown): Degree | null {
  if (raw === null || raw === undefined) return null;
  const source = record(raw);
  const numeral = oneOf<Numeral | "">(source.numeral, ["", ...NUMERALS], "");
  if (!numeral) return null;
  return {
    sub: source.sub === true,
    accidental: oneOf(source.accidental, ACCIDENTALS, ""),
    numeral,
    quality: text(source.quality, LIMITS.quality).trim(),
    target: text(source.target, LIMITS.target).trim(),
  };
}

function normalizeEntry(raw: unknown): ChordEntry {
  const source = record(raw);
  const badges = Array.isArray(source.badges)
    ? [
        ...new Set(
          source.badges.filter((b): b is ChordBadge =>
            (CHORD_BADGES as readonly unknown[]).includes(b),
          ),
        ),
      ]
    : [];
  return {
    degree: normalizeDegree(source.degree),
    fn:
      source.fn === null || source.fn === undefined
        ? null
        : oneOf<HarmonicFunction | "">(
            source.fn,
            ["", ...HARMONIC_FUNCTIONS],
            "",
          ) || null,
    badges,
    custom: text(source.custom, LIMITS.custom),
    note: text(source.note, LIMITS.note),
  };
}

/**
 * Coerces a stored (or client-built) document into a valid analysis.
 * Anything malformed is dropped, never trusted: the API only guarantees a
 * bounded JSON object.
 */
export function normalizeAnalysis(raw: unknown): HarmonicAnalysis {
  const source = record(raw);
  const analysis = emptyAnalysis();

  if (Array.isArray(source.chords)) {
    analysis.chords = source.chords
      .slice(0, LIMITS.chords)
      .map((chord) => (typeof chord === "string" ? chord.slice(0, 32) : ""));
  }

  for (const [key, value] of Object.entries(record(source.entries))) {
    const i = index(Number(key));
    if (i === null || String(i) !== key) continue;
    const entry = normalizeEntry(value);
    if (!entryIsEmpty(entry)) analysis.entries[key] = entry;
  }

  const ids = new Set<string>();
  const uniqueId = (value: unknown) => {
    let id =
      typeof value === "string" && /^[\w-]{1,24}$/.test(value)
        ? value
        : newId();
    while (ids.has(id)) id = newId();
    ids.add(id);
    return id;
  };

  if (Array.isArray(source.connections)) {
    for (const raw of source.connections.slice(0, LIMITS.connections)) {
      const c = record(raw);
      const from = index(c.from);
      const to = index(c.to);
      if (from === null || to === null || from === to) continue;
      analysis.connections.push({
        id: uniqueId(c.id),
        from,
        to,
        kind: oneOf(c.kind, CONNECTION_KINDS, "dominant"),
      });
    }
  }

  if (Array.isArray(source.keys)) {
    const seen = new Set<number>();
    for (const raw of source.keys.slice(0, LIMITS.keys)) {
      const k = record(raw);
      const at = index(k.at);
      const key = oneOf<string>(k.key, KEY_NAMES, "");
      if (at === null || !key || seen.has(at)) continue;
      seen.add(at);
      analysis.keys.push({ at, key });
    }
    analysis.keys.sort((a, b) => a.at - b.at);
  }

  if (Array.isArray(source.notes)) {
    for (const raw of source.notes.slice(0, LIMITS.notes)) {
      const n = record(raw);
      const from = index(n.from);
      const to = index(n.to);
      const body = text(n.text, LIMITS.rangeNote);
      if (from === null || to === null) continue;
      analysis.notes.push({
        id: uniqueId(n.id),
        from: Math.min(from, to),
        to: Math.max(from, to),
        text: body,
        color: oneOf(n.color, NOTE_COLORS, "amber"),
      });
    }
  }

  analysis.summary = text(source.summary, LIMITS.summary);
  const display = record(source.display);
  analysis.display = {
    showLyrics:
      typeof display.showLyrics === "boolean"
        ? display.showLyrics
        : DEFAULT_DISPLAY.showLyrics,
    showChords:
      typeof display.showChords === "boolean"
        ? display.showChords
        : DEFAULT_DISPLAY.showChords,
    showFunctions:
      typeof display.showFunctions === "boolean"
        ? display.showFunctions
        : DEFAULT_DISPLAY.showFunctions,
    twoFiveStyle: oneOf(
      display.twoFiveStyle,
      ["bracket", "arrow"] as const,
      "bracket",
    ),
  };

  return analysis;
}

/**
 * The document as saved: empty entries dropped, references to chords
 * past the end of the chart removed.
 */
export function compactAnalysis(
  analysis: HarmonicAnalysis,
  chordCount: number,
): HarmonicAnalysis {
  const inRange = (i: number) => i >= 0 && i < chordCount;
  const entries: Record<string, ChordEntry> = {};
  for (const [key, entry] of Object.entries(analysis.entries)) {
    if (inRange(Number(key)) && !entryIsEmpty(entry)) entries[key] = entry;
  }
  return {
    ...analysis,
    entries,
    connections: analysis.connections.filter(
      (c) => inRange(c.from) && inRange(c.to),
    ),
    keys: analysis.keys.filter((k) => inRange(k.at)),
    notes: analysis.notes.filter((n) => inRange(n.from) && inRange(n.to)),
  };
}

/** Whether the analysis says anything at all. */
export function analysisIsEmpty(analysis: HarmonicAnalysis): boolean {
  return (
    Object.values(analysis.entries).every(entryIsEmpty) &&
    analysis.connections.length === 0 &&
    analysis.keys.length === 0 &&
    analysis.notes.length === 0 &&
    !analysis.summary.trim()
  );
}

// Writing degrees

/** "SubV7/II", "bVII7", "V7/IIm" — the degree as plain text. */
export function formatDegree(degree: Degree | null): string {
  if (!degreeIsSet(degree)) return "";
  const head = `${degree.sub ? "Sub" : ""}${degree.accidental}${degree.numeral}${degree.quality}`;
  return degree.target ? `${head}/${degree.target}` : head;
}

/** Accidentals as music symbols: "b" → ♭, "#" → ♯ (for display only). */
export function prettyAccidentals(value: string): string {
  return value.replace(/b(?=[IV\d])/g, "♭").replace(/#/g, "♯");
}

/**
 * Reads a degree typed as text ("V7/II", "SubV7", "bVII7M", "IIm7(b5)"),
 * or null when it doesn't start with a numeral. Used by the quick-entry
 * field: the builder's buttons and typing produce the same thing.
 */
export function parseDegree(input: string): Degree | null {
  const trimmed = input.trim().replace(/♭/g, "b").replace(/♯/g, "#");
  const match =
    /^(sub)?\s*([b#]?)(VII|VI|V|IV|III|II|I)(?![IV])([^/]*)(?:\/(.*))?$/i.exec(
      trimmed,
    );
  if (!match) return null;
  const numeral = match[3].toUpperCase() as Numeral;
  return {
    sub: !!match[1],
    accidental: (match[2] as Accidental) ?? "",
    numeral,
    quality: (match[4] ?? "").trim().slice(0, LIMITS.quality),
    // "v7/ii" → "V7/II": the numeral of the target in capitals too.
    target: (match[5] ?? "")
      .trim()
      .replace(
        /^([b#]?)([iv]+)/i,
        (_, accidental: string, numeral: string) =>
          `${accidental}${numeral.toUpperCase()}`,
      )
      .slice(0, LIMITS.target),
  };
}

// The chart, as the analysis sees it

export interface ChordCell {
  kind: "chord";
  /** Position in the song's chord sequence: what the analysis is keyed by. */
  index: number;
  symbol: string;
  /** The lyric under the chord (may be empty). */
  lyric: string;
}

export interface LyricCell {
  kind: "lyric";
  text: string;
}

export interface FillerCell {
  kind: "filler";
  text: string;
}

export type Cell = ChordCell | LyricCell | FillerCell;

export type SheetLine =
  | {
      kind: "heading";
      section: SectionKey | null;
      heading: SectionHeading | null;
      raw: string;
    }
  | { kind: "gap" }
  | { kind: "text"; text: string }
  | { kind: "comment"; text: string }
  | {
      kind: "chords";
      /** Words that never wrap internally, each a run of cells. */
      words: Cell[][];
      /** A line of chords only, with no lyric under them. */
      bare: boolean;
      chorus: boolean;
    };

const stripAnnotations = (value: string) =>
  value
    .split(ANNOTATION_MARK)
    .filter((_, i) => i % 2 === 0)
    .join("");

/**
 * The chart as lines of cells, each chord numbered in reading order.
 * `index` is stable for a given chart, and is what everything in the
 * analysis refers to. Tablature and capo lines carry no harmony and are
 * left out.
 */
export function buildSheet(blocks: readonly Block[]): {
  lines: SheetLine[];
  chords: ChordCell[];
} {
  const lines: SheetLine[] = [];
  const chords: ChordCell[] = [];

  const chordCell = (symbol: string, lyric: string): ChordCell => {
    const cell: ChordCell = {
      kind: "chord",
      index: chords.length,
      symbol: symbol.trim(),
      lyric,
    };
    chords.push(cell);
    return cell;
  };

  for (const block of blocks) {
    switch (block.type) {
      case "blank":
        lines.push({ kind: "gap" });
        break;
      case "heading":
        if (!block.key && !block.raw) break;
        lines.push({
          kind: "heading",
          section: block.key,
          heading: block.heading,
          raw: block.raw,
        });
        break;
      case "comment":
        lines.push({ kind: "comment", text: stripAnnotations(block.text) });
        break;
      case "chorusRepeat":
        lines.push({
          kind: "heading",
          section: "chorus",
          heading: null,
          raw: block.label ?? "",
        });
        break;
      case "lyric": {
        if (!block.hasChords) {
          const value = stripAnnotations(
            block.words
              .map((word) => word.map((s) => s.text).join(""))
              .join(""),
          )
            .replace(/[ \t]{2,}/g, " ")
            .trim();
          if (value) lines.push({ kind: "text", text: value });
          break;
        }
        const words = block.words.map((word) =>
          word.map((segment): Cell =>
            segment.chord === null
              ? { kind: "lyric", text: stripAnnotations(segment.text) }
              : chordCell(segment.chord, stripAnnotations(segment.text)),
          ),
        );
        lines.push({
          kind: "chords",
          words,
          bare: false,
          chorus: block.chorus,
        });
        break;
      }
      case "chords": {
        const words = block.items.map((item): Cell[] => [
          item.chord
            ? chordCell(item.text, "")
            : { kind: "filler", text: item.text },
        ]);
        lines.push({ kind: "chords", words, bare: true, chorus: block.chorus });
        break;
      }
      default:
        break;
    }
  }

  // Tidy gaps: none at the edges, never two in a row, none after a heading.
  const tidy: SheetLine[] = [];
  for (const line of lines) {
    const previous = tidy[tidy.length - 1];
    if (
      line.kind === "gap" &&
      (!previous || previous.kind === "gap" || previous.kind === "heading")
    ) {
      continue;
    }
    if (line.kind === "heading" && previous?.kind === "gap") tidy.pop();
    tidy.push(line);
  }
  while (tidy.length && tidy[tidy.length - 1].kind === "gap") tidy.pop();

  return { lines: tidy, chords };
}

/** Whether a chord symbol can carry a degree ("N.C." cannot). */
export function isAnalysableChord(symbol: string): boolean {
  return parseChord(symbol.replace(/^\((.+)\)$/, "$1")) !== null;
}

// Keys

/** The key in force at each chord: the latest mark at or before it. */
export function keyAt(
  analysis: HarmonicAnalysis,
  chordIndex: number,
  fallback: string | null,
): string | null {
  let key = fallback;
  for (const mark of analysis.keys) {
    if (mark.at <= chordIndex) key = mark.key;
    else break;
  }
  return key;
}

export function isMinorKey(key: string | null): boolean {
  return !!key && /m$/.test(key);
}

// Re-attaching to an edited chart

/**
 * Longest-common-subsequence alignment of two chord sequences: for each
 * old index, its new index (or -1 when that chord is gone).
 */
export function alignChords(
  previous: readonly string[],
  current: readonly string[],
): number[] {
  const n = previous.length;
  const m = current.length;
  const mapping = new Array<number>(n).fill(-1);
  if (n === 0 || m === 0) return mapping;

  // Same prefix and suffix first: the common case is a small edit.
  let start = 0;
  while (start < n && start < m && previous[start] === current[start]) {
    mapping[start] = start;
    start++;
  }
  let endOld = n - 1;
  let endNew = m - 1;
  while (
    endOld >= start &&
    endNew >= start &&
    previous[endOld] === current[endNew]
  ) {
    mapping[endOld] = endNew;
    endOld--;
    endNew--;
  }

  const a = previous.slice(start, endOld + 1);
  const b = current.slice(start, endNew + 1);
  if (a.length && b.length) {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const table = new Uint16Array(rows * cols);
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        table[i * cols + j] =
          a[i] === b[j]
            ? table[(i + 1) * cols + j + 1] + 1
            : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        mapping[start + i] = start + j;
        i++;
        j++;
      } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) {
        i++;
      } else {
        j++;
      }
    }
  }
  return mapping;
}

export interface Reconciled {
  analysis: HarmonicAnalysis;
  /** Whether the chart's chords changed since the analysis was saved. */
  changed: boolean;
  /** Marks whose chords are no longer in the chart (and were dropped). */
  lost: number;
}

/**
 * Re-attaches an analysis to the chart's current chords. When the chart
 * was edited after the analysis was written — a chord changed, a verse
 * added — every mark follows its chord to its new position; marks on
 * chords that no longer exist are dropped and counted, so the editor can
 * say so.
 */
export function reconcile(
  analysis: HarmonicAnalysis,
  current: readonly string[],
): Reconciled {
  const previous = analysis.chords;
  const same =
    previous.length === current.length &&
    previous.every((chord, i) => chord === current[i]);
  if (same || previous.length === 0) {
    return {
      analysis: { ...analysis, chords: [...current] },
      changed: !same && previous.length > 0,
      lost: 0,
    };
  }

  const map = alignChords(previous, current);
  const to = (i: number) => (i >= 0 && i < map.length ? map[i] : -1);
  let lost = 0;

  const entries: Record<string, ChordEntry> = {};
  for (const [key, entry] of Object.entries(analysis.entries)) {
    const next = to(Number(key));
    if (next < 0) {
      if (!entryIsEmpty(entry)) lost++;
      continue;
    }
    entries[String(next)] = entry;
  }

  const connections: Connection[] = [];
  for (const connection of analysis.connections) {
    const from = to(connection.from);
    const target = to(connection.to);
    if (from < 0 || target < 0 || from === target) {
      lost++;
      continue;
    }
    connections.push({ ...connection, from, to: target });
  }

  const keys: KeyMark[] = [];
  for (const mark of analysis.keys) {
    const at = to(mark.at);
    if (at < 0) {
      lost++;
      continue;
    }
    if (!keys.some((k) => k.at === at)) keys.push({ ...mark, at });
  }
  keys.sort((a, b) => a.at - b.at);

  // A passage keeps whatever of it survived: its ends move inwards to the
  // nearest chords that are still there.
  const notes: RangeNote[] = [];
  for (const note of analysis.notes) {
    const survivors: number[] = [];
    for (let i = note.from; i <= note.to; i++) {
      if (to(i) >= 0) survivors.push(to(i));
    }
    if (survivors.length === 0) {
      lost++;
      continue;
    }
    notes.push({
      ...note,
      from: Math.min(...survivors),
      to: Math.max(...survivors),
    });
  }

  return {
    analysis: {
      ...analysis,
      chords: [...current],
      entries,
      connections,
      keys,
      notes,
    },
    changed: true,
    lost,
  };
}

// Footnotes

export interface Footnote {
  number: number;
  kind: "chord" | "range";
  /** The chord the note is on, or where the passage starts. */
  at: number;
  /** For a passage. */
  id?: string;
  text: string;
}

/**
 * Chord notes and passage notes, numbered together in the order they
 * appear in the song — like the footnotes of a printed analysis.
 */
export function footnotes(analysis: HarmonicAnalysis): Footnote[] {
  const items: Omit<Footnote, "number">[] = [];
  for (const [key, entry] of Object.entries(analysis.entries)) {
    if (entry.note.trim())
      items.push({ kind: "chord", at: Number(key), text: entry.note.trim() });
  }
  for (const note of analysis.notes) {
    items.push({
      kind: "range",
      at: note.from,
      id: note.id,
      text: note.text.trim(),
    });
  }
  items.sort(
    (a, b) =>
      a.at - b.at || (a.kind === b.kind ? 0 : a.kind === "range" ? -1 : 1),
  );
  return items.map((item, i) => ({ ...item, number: i + 1 }));
}

// Editing
//
// Every change the editor makes goes through these: each returns a new
// document (the editor keeps the old ones for undo) and leaves it valid.

export function setEntry(
  analysis: HarmonicAnalysis,
  chordIndex: number,
  patch: Partial<ChordEntry>,
): HarmonicAnalysis {
  const key = String(chordIndex);
  const entry = { ...(analysis.entries[key] ?? emptyEntry()), ...patch };
  const entries = { ...analysis.entries };
  if (entryIsEmpty(entry)) delete entries[key];
  else entries[key] = entry;
  return { ...analysis, entries };
}

/** Removes everything attached to one chord. */
export function clearChord(
  analysis: HarmonicAnalysis,
  chordIndex: number,
): HarmonicAnalysis {
  const entries = { ...analysis.entries };
  delete entries[String(chordIndex)];
  return {
    ...analysis,
    entries,
    connections: analysis.connections.filter(
      (c) => c.from !== chordIndex && c.to !== chordIndex,
    ),
    keys: analysis.keys.filter((k) => k.at !== chordIndex),
  };
}

export function addConnection(
  analysis: HarmonicAnalysis,
  from: number,
  to: number,
  kind: ConnectionKind,
  id: string = newId(),
): HarmonicAnalysis {
  if (from === to) return analysis;
  // One line of a kind between the same two chords.
  const exists = analysis.connections.some(
    (c) => c.from === from && c.to === to && c.kind === kind,
  );
  if (exists || analysis.connections.length >= LIMITS.connections) {
    return analysis;
  }
  return {
    ...analysis,
    connections: [...analysis.connections, { id, from, to, kind }],
  };
}

export function updateConnection(
  analysis: HarmonicAnalysis,
  id: string,
  patch: Partial<Pick<Connection, "kind">>,
): HarmonicAnalysis {
  return {
    ...analysis,
    connections: analysis.connections.map((c) =>
      c.id === id ? { ...c, ...patch } : c,
    ),
  };
}

export function removeConnection(
  analysis: HarmonicAnalysis,
  id: string,
): HarmonicAnalysis {
  return {
    ...analysis,
    connections: analysis.connections.filter((c) => c.id !== id),
  };
}

/** Sets (or, with null, removes) the key that starts at a chord. */
export function setKeyMark(
  analysis: HarmonicAnalysis,
  at: number,
  key: string | null,
): HarmonicAnalysis {
  const keys = analysis.keys.filter((k) => k.at !== at);
  if (key && (KEY_NAMES as readonly string[]).includes(key)) {
    keys.push({ at, key });
  }
  keys.sort((a, b) => a.at - b.at);
  return { ...analysis, keys };
}

export function addRangeNote(
  analysis: HarmonicAnalysis,
  from: number,
  to: number,
  color: NoteColor = "amber",
  id: string = newId(),
): { analysis: HarmonicAnalysis; id: string | null } {
  if (analysis.notes.length >= LIMITS.notes) return { analysis, id: null };
  return {
    analysis: {
      ...analysis,
      notes: [
        ...analysis.notes,
        {
          id,
          from: Math.min(from, to),
          to: Math.max(from, to),
          text: "",
          color,
        },
      ],
    },
    id,
  };
}

export function updateRangeNote(
  analysis: HarmonicAnalysis,
  id: string,
  patch: Partial<Omit<RangeNote, "id">>,
): HarmonicAnalysis {
  return {
    ...analysis,
    notes: analysis.notes.map((note) => {
      if (note.id !== id) return note;
      const next = { ...note, ...patch };
      if (next.text.length > LIMITS.rangeNote) {
        next.text = next.text.slice(0, LIMITS.rangeNote);
      }
      return {
        ...next,
        from: Math.min(next.from, next.to),
        to: Math.max(next.from, next.to),
      };
    }),
  };
}

export function removeRangeNote(
  analysis: HarmonicAnalysis,
  id: string,
): HarmonicAnalysis {
  return { ...analysis, notes: analysis.notes.filter((n) => n.id !== id) };
}

/**
 * The other chords a chord's degree could be copied to: the same symbol,
 * in the same key, not analysed yet. What "apply to the same chords"
 * offers — the musician decides, nothing is filled in on its own.
 */
export function sameChordTargets(
  analysis: HarmonicAnalysis,
  chords: readonly string[],
  chordIndex: number,
  songKey: string | null,
): number[] {
  const symbol = chords[chordIndex];
  if (!symbol) return [];
  const key = keyAt(analysis, chordIndex, songKey);
  const targets: number[] = [];
  chords.forEach((other, i) => {
    if (i === chordIndex || other !== symbol) return;
    if (keyAt(analysis, i, songKey) !== key) return;
    if (degreeIsSet(analysis.entries[String(i)]?.degree)) return;
    targets.push(i);
  });
  return targets;
}

/** Copies a chord's degree and function to `targets`. */
export function copyDegree(
  analysis: HarmonicAnalysis,
  chordIndex: number,
  targets: readonly number[],
): HarmonicAnalysis {
  const source = analysis.entries[String(chordIndex)];
  if (!source || !degreeIsSet(source.degree)) return analysis;
  let next = analysis;
  for (const target of targets) {
    next = setEntry(next, target, {
      degree: { ...source.degree },
      fn: source.fn,
    });
  }
  return next;
}
