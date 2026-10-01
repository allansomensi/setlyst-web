/**
 * What an analysis adds up to: how the song's harmony is spent (functions,
 * kinds of chords, the degrees it leans on), how it moves (functional
 * flow, root motion), what it repeats, how complex it is — and a review
 * of what was written, pointing at degrees that don't match their chord,
 * arrows that don't resolve where they say, and the like.
 *
 * Read from the written degrees, with the assistant's reading standing in
 * for chords not analysed yet (and counted apart, so the overview can say
 * how much of it is inferred). Pure and framework-free.
 */

import { parseKey } from "./chords";
import {
  degreeIsSet,
  formatDegree,
  isMinorKey,
  keyAt,
  type Degree,
  type HarmonicAnalysis,
  type HarmonicFunction,
  type SheetSection,
} from "./analysis";
import {
  describeDegree,
  findPatterns,
  isDominant,
  qualityOf,
  resolutionOf,
  rootOf,
  roleInPatterns,
  type ConceptId,
} from "./analysis-concepts";
import { chordShape, coarseFamily, mod12 } from "./analysis-theory";
import type { ChordSuggestion } from "./analysis-suggest";

// Reading every chord

export type ChordCategory =
  | "diatonic"
  | "secondaryDominant"
  | "substitute"
  | "relatedTwo"
  | "borrowed"
  | "diminished"
  | "chromatic";

export const CHORD_CATEGORIES: readonly ChordCategory[] = [
  "diatonic",
  "secondaryDominant",
  "substitute",
  "relatedTwo",
  "borrowed",
  "diminished",
  "chromatic",
];

const CATEGORY_OF: Record<ConceptId, ChordCategory> = {
  tonic: "diatonic",
  tonicRelative: "diatonic",
  tonicAntiRelative: "diatonic",
  relativeMajor: "diatonic",
  subdominant: "diatonic",
  subdominantRelative: "diatonic",
  dominant: "diatonic",
  dominantMinorKey: "diatonic",
  dominantNoRoot: "diatonic",
  minorFive: "diatonic",
  subtonic: "diatonic",
  secondaryDominant: "secondaryDominant",
  secondaryLeadingTone: "secondaryDominant",
  substituteDominant: "substitute",
  secondarySubstitute: "substitute",
  relatedTwo: "relatedTwo",
  modalBorrowing: "borrowed",
  subdominantMinor: "borrowed",
  neapolitan: "borrowed",
  diminishedAscending: "diminished",
  diminishedDescending: "diminished",
  diminishedAuxiliary: "diminished",
  diminished: "diminished",
  augmented: "chromatic",
  chromatic: "chromatic",
};

export interface ChordReading {
  index: number;
  symbol: string;
  key: string | null;
  degree: Degree | null;
  /** The degree came from the assistant, not from the analysis. */
  inferred: boolean;
  fn: HarmonicFunction | null;
  /** The function came from the degree's name, not from the analysis. */
  fnInferred: boolean;
  category: ChordCategory | null;
}

/**
 * Every chord with its degree and function: as written, or — where
 * nothing is written yet — as the assistant reads it.
 */
export function readChords(
  analysis: HarmonicAnalysis,
  chords: readonly string[],
  songKey: string | null,
  suggestions: readonly ChordSuggestion[] = [],
): ChordReading[] {
  const suggested = new Map(suggestions.map((s) => [s.index, s]));
  const patterns = findPatterns(analysis, chords.length);
  return chords.map((symbol, index) => {
    const entry = analysis.entries[String(index)];
    const key = keyAt(analysis, index, songKey);
    const written = degreeIsSet(entry?.degree) ? entry.degree : null;
    const suggestion = suggested.get(index);
    const degree = written ?? suggestion?.degree ?? null;
    const minor = isMinorKey(key);
    const concept = written
      ? (roleInPatterns(patterns, index) ?? describeDegree(written, minor))
      : degree
        ? describeDegree(degree, minor)
        : null;
    const category = written
      ? concept
        ? CATEGORY_OF[concept.id]
        : null
      : suggestion
        ? categoryOfReason(suggestion.reason)
        : null;
    const fn =
      entry?.fn ?? (written ? (concept?.fn ?? null) : (suggestion?.fn ?? null));
    return {
      index,
      symbol,
      key,
      degree,
      inferred: !written && !!degree,
      fn,
      fnInferred: !entry?.fn && !!fn,
      category,
    };
  });
}

function categoryOfReason(reason: ChordSuggestion["reason"]): ChordCategory {
  switch (reason) {
    case "secondaryDominant":
    case "unresolvedDominant":
      return "secondaryDominant";
    case "substitute":
      return "substitute";
    case "relatedTwo":
      return "relatedTwo";
    case "borrowed":
    case "neapolitan":
    case "backdoor":
      return "borrowed";
    case "diminishedAscending":
    case "diminishedDescending":
    case "diminishedAuxiliary":
    case "diminished":
      return "diminished";
    case "approach":
    case "chromatic":
      return "chromatic";
    default:
      return "diatonic";
  }
}

// Statistics

export type RootMotion =
  | "fourthUp"
  | "fifthUp"
  | "stepUp"
  | "stepDown"
  | "halfUp"
  | "halfDown"
  | "thirdUp"
  | "thirdDown"
  | "tritone";

export const ROOT_MOTIONS: readonly RootMotion[] = [
  "fourthUp",
  "fifthUp",
  "stepUp",
  "stepDown",
  "halfUp",
  "halfDown",
  "thirdUp",
  "thirdDown",
  "tritone",
];

const MOTION_BY_INTERVAL: Record<number, RootMotion> = {
  1: "halfUp",
  2: "stepUp",
  3: "thirdUp",
  4: "thirdUp",
  5: "fourthUp",
  6: "tritone",
  7: "fifthUp",
  8: "thirdDown",
  9: "thirdDown",
  10: "stepDown",
  11: "halfDown",
};

export interface Progression {
  /** The degrees, as written ("IIm7", "V7", "I7M"). */
  labels: string[];
  /** Where each occurrence starts (chord indexes). */
  starts: number[];
}

export interface KeyRegion {
  key: string;
  from: number;
  to: number;
}

export type ComplexityLevel = "simple" | "moderate" | "rich" | "advanced";

export interface AnalysisStats {
  total: number;
  /** Chords with a degree written. */
  analysed: number;
  /** Chords whose degree only the assistant gives. */
  inferred: number;
  distinctChords: number;
  distinctDegrees: number;
  functions: Record<HarmonicFunction | "none", number>;
  categories: Record<ChordCategory, number>;
  /** Most used degrees, most frequent first. */
  degrees: { label: string; count: number }[];
  /** "T>SD" → how many times a tonic chord moves to a subdominant one. */
  transitions: Record<string, number>;
  motions: Record<RootMotion, number>;
  progressions: Progression[];
  regions: KeyRegion[];
  /** Chords written with tensions (9, 11, 13 and alterations). */
  tensions: number;
  complexity: { score: number; level: ComplexityLevel };
}

const emptyCategories = (): Record<ChordCategory, number> => ({
  diatonic: 0,
  secondaryDominant: 0,
  substitute: 0,
  relatedTwo: 0,
  borrowed: 0,
  diminished: 0,
  chromatic: 0,
});

/** The keys of a song, as stretches of chords. */
export function keyRegions(
  analysis: HarmonicAnalysis,
  chordCount: number,
  songKey: string | null,
): KeyRegion[] {
  const regions: KeyRegion[] = [];
  for (let i = 0; i < chordCount; i++) {
    const key = keyAt(analysis, i, songKey);
    if (!key) continue;
    const last = regions[regions.length - 1];
    if (last && last.key === key && last.to === i - 1) last.to = i;
    else regions.push({ key, from: i, to: i });
  }
  return regions;
}

/**
 * Progressions the song comes back to: runs of two to six degrees heard
 * at least twice, longest first, a shorter one left out when it only
 * ever appears inside a longer one.
 */
export function recurringProgressions(
  labels: readonly (string | null)[],
  limit = 8,
): Progression[] {
  const found: Progression[] = [];
  const covered = new Set<string>();
  for (let size = Math.min(6, labels.length); size >= 2; size--) {
    const seen = new Map<string, number[]>();
    for (let i = 0; i + size <= labels.length; i++) {
      const run = labels.slice(i, i + size);
      if (run.some((l) => !l)) continue;
      if (new Set(run).size < 2) continue;
      const id = run.join(" ");
      const starts = seen.get(id) ?? [];
      // Occurrences don't overlap.
      if (!starts.length || i >= starts[starts.length - 1] + size) {
        starts.push(i);
      }
      seen.set(id, starts);
    }
    for (const [id, starts] of seen) {
      if (starts.length < 2) continue;
      const inside = starts.every((start) =>
        [...covered].some((c) => {
          const [from, to] = c.split(":").map(Number);
          return start >= from && start + size - 1 <= to;
        }),
      );
      if (inside) continue;
      found.push({ labels: id.split(" "), starts });
      for (const start of starts) covered.add(`${start}:${start + size - 1}`);
    }
  }
  return found
    .sort(
      (a, b) =>
        b.labels.length * b.starts.length - a.labels.length * a.starts.length ||
        a.starts[0] - b.starts[0],
    )
    .slice(0, limit);
}

/** Everything the insights panel shows. */
export function analysisStats(
  analysis: HarmonicAnalysis,
  chords: readonly string[],
  songKey: string | null,
  suggestions: readonly ChordSuggestion[] = [],
): AnalysisStats {
  const readings = readChords(analysis, chords, songKey, suggestions);
  const functions: AnalysisStats["functions"] = { T: 0, SD: 0, D: 0, none: 0 };
  const categories = emptyCategories();
  const degreeCount = new Map<string, number>();
  const transitions: Record<string, number> = {};
  const motions = Object.fromEntries(ROOT_MOTIONS.map((m) => [m, 0])) as Record<
    RootMotion,
    number
  >;
  let tensions = 0;

  let previousFn: HarmonicFunction | null = null;
  let previousRoot: number | null = null;
  for (const reading of readings) {
    functions[reading.fn ?? "none"]++;
    if (reading.category) categories[reading.category]++;
    if (reading.degree) {
      const label = formatDegree(reading.degree);
      degreeCount.set(label, (degreeCount.get(label) ?? 0) + 1);
    }
    if (reading.fn) {
      if (previousFn) {
        const id = `${previousFn}>${reading.fn}`;
        transitions[id] = (transitions[id] ?? 0) + 1;
      }
      previousFn = reading.fn;
    }
    const shape = chordShape(reading.symbol);
    if (shape) {
      if (shape.tensions.length) tensions++;
      if (previousRoot !== null && previousRoot !== shape.root) {
        motions[MOTION_BY_INTERVAL[mod12(shape.root - previousRoot)]]++;
      }
      previousRoot = shape.root;
    }
  }

  const labels = readings.map((r) =>
    r.degree ? formatDegree(r.degree) : null,
  );
  const progressions = recurringProgressions(labels);
  const regions = keyRegions(analysis, chords.length, songKey);
  const analysed = readings.filter((r) => r.degree && !r.inferred).length;
  const inferred = readings.filter((r) => r.inferred).length;
  // Chords that got a category; with none, nothing counts as chromatic
  // (a `|| 1` here made an empty reading look "rich").
  const read = readings.filter((r) => r.category).length;
  const chromaticShare = read ? (read - categories.diatonic) / read : 0;
  const total = chords.length || 1;

  const distinctDegrees = degreeCount.size;
  const distinctChords = new Set(chords).size;
  const keyChanges = new Set(regions.map((r) => r.key)).size - 1;
  const score = Math.round(
    100 *
      Math.min(
        1,
        0.45 * chromaticShare +
          0.15 * Math.min(1, distinctDegrees / 16) +
          0.15 * Math.min(1, Math.max(0, keyChanges) / 3) +
          0.15 * (tensions / total) +
          0.1 * Math.min(1, distinctChords / 20),
      ),
  );
  const level: ComplexityLevel =
    score < 20
      ? "simple"
      : score < 40
        ? "moderate"
        : score < 60
          ? "rich"
          : "advanced";

  return {
    total: chords.length,
    analysed,
    inferred,
    distinctChords,
    distinctDegrees,
    functions,
    categories,
    degrees: [...degreeCount.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    transitions,
    motions,
    progressions,
    regions,
    tensions,
    complexity: { score, level },
  };
}

// The progression, section by section

export interface SectionProgression {
  section: SheetSection;
  chords: ChordReading[];
}

export function progressionBySection(
  sections: readonly SheetSection[],
  readings: readonly ChordReading[],
): SectionProgression[] {
  return sections.map((section) => ({
    section,
    chords: section.chords
      .map((i) => readings[i])
      .filter((r): r is ChordReading => !!r),
  }));
}

// Review

export type IssueId =
  | "rootMismatch"
  | "qualityMismatch"
  | "dominantTarget"
  | "subVTarget"
  | "twoFiveShape"
  | "unresolved"
  | "functionConflict"
  | "emptyPassage"
  | "noKey";

export interface Issue {
  id: IssueId;
  severity: "warning" | "info";
  /** The chord it's about (the first one, for a line). */
  at: number;
  /** For a line or a passage. */
  ref?: string;
  /** What the review would write instead (a degree, a function). */
  expected?: string;
}

/**
 * What looks wrong in an analysis: a degree whose root or kind doesn't
 * match the chord it's written on (in the key in force), a resolution
 * arrow whose chords aren't a fifth (or, for a SubV, a half step) apart,
 * a II–V bracket that isn't one, a dominant that doesn't go where its
 * degree says, a function at odds with the degree, an empty passage.
 */
export function reviewAnalysis(
  analysis: HarmonicAnalysis,
  chords: readonly string[],
  songKey: string | null,
  suggestions: readonly ChordSuggestion[] = [],
): Issue[] {
  const issues: Issue[] = [];
  const suggested = new Map(suggestions.map((s) => [s.index, s]));
  const patterns = findPatterns(analysis, chords.length);
  const shapes = chords.map((c) => chordShape(c));

  const hasDegrees = Object.values(analysis.entries).some((e) =>
    degreeIsSet(e.degree),
  );
  if (hasDegrees && !songKey && analysis.keys.length === 0) {
    issues.push({ id: "noKey", severity: "warning", at: 0 });
  }

  for (const [key, entry] of Object.entries(analysis.entries)) {
    const index = Number(key);
    const shape = shapes[index];
    const songKeyHere = keyAt(analysis, index, songKey);
    const parsed = parseKey(songKeyHere);
    if (!degreeIsSet(entry.degree) || !shape || !parsed) continue;
    const degree = entry.degree;
    const expected = suggested.get(index);
    const root = rootOf(degree);
    const actual = mod12(shape.root - parsed.pitchClass);
    if (root !== null && root !== actual) {
      issues.push({
        id: "rootMismatch",
        severity: "warning",
        at: index,
        expected: expected ? formatDegree(expected.degree) : undefined,
      });
      continue;
    }
    const written = coarseFamily(qualityOf(degree.quality));
    const real = coarseFamily(shape.family);
    if (written !== real) {
      issues.push({
        id: "qualityMismatch",
        severity: "warning",
        at: index,
        expected: expected ? formatDegree(expected.degree) : undefined,
      });
    }
    const concept =
      roleInPatterns(patterns, index) ?? describeDegree(degree, parsed.isMinor);
    if (entry.fn && concept?.fn && entry.fn !== concept.fn) {
      issues.push({
        id: "functionConflict",
        severity: "info",
        at: index,
        expected: concept.fn,
      });
    }
  }

  // Lines between chords.
  for (const connection of analysis.connections) {
    const from = shapes[connection.from];
    const to = shapes[connection.to];
    if (!from || !to) continue;
    const interval = mod12(from.root - to.root);
    if (connection.kind === "dominant" && interval !== 7) {
      // A backdoor bVII7 → I resolves a whole step up, on purpose.
      const backdoor =
        interval === 10 && from.family === "dominant" && to.family !== "minor";
      if (!backdoor) {
        issues.push({
          id: "dominantTarget",
          severity: "warning",
          at: connection.from,
          ref: connection.id,
        });
      }
    }
    if (connection.kind === "subV" && interval !== 1) {
      issues.push({
        id: "subVTarget",
        severity: "warning",
        at: connection.from,
        ref: connection.id,
      });
    }
    if (
      connection.kind === "twoFive" &&
      (mod12(to.root - from.root) !== 5 ||
        (from.family !== "minor" && from.family !== "halfDiminished"))
    ) {
      issues.push({
        id: "twoFiveShape",
        severity: "info",
        at: connection.from,
        ref: connection.id,
      });
    }
  }

  // A dominant whose degree says where it goes, followed by something else
  // (a deceptive resolution worth naming, or a degree to check).
  const analysedIndexes = Object.keys(analysis.entries)
    .map(Number)
    .filter((i) => degreeIsSet(analysis.entries[String(i)]?.degree))
    .sort((a, b) => a - b);
  analysedIndexes.forEach((index) => {
    const degree = analysis.entries[String(index)].degree;
    if (!isDominant(degree) || (!degree.target && !degree.sub)) return;
    // The chord that actually follows (skipping what can't be read, like
    // N.C., and the same dominant held on: A7 A7(b9) Dm7), read by its
    // written degree or else by the suggestion: the next *analysed* chord
    // may be several chords later.
    const root = shapes[index]?.root;
    let nextIndex = index + 1;
    while (
      nextIndex < shapes.length &&
      (!shapes[nextIndex] || shapes[nextIndex]?.root === root)
    ) {
      nextIndex++;
    }
    if (nextIndex >= shapes.length) return;
    const written = analysis.entries[String(nextIndex)]?.degree;
    const next = degreeIsSet(written)
      ? written
      : suggested.get(nextIndex)?.degree;
    if (!next) return;
    const resolution = resolutionOf(degree);
    const nextRoot = next ? rootOf(next) : null;
    if (resolution === null || nextRoot === null) return;
    const deceptive = analysis.connections.some(
      (c) => c.from === index && c.kind === "deceptive",
    );
    if (nextRoot !== resolution && !deceptive) {
      issues.push({ id: "unresolved", severity: "info", at: index });
    }
  });

  for (const note of analysis.notes) {
    if (!note.text.trim()) {
      issues.push({
        id: "emptyPassage",
        severity: "info",
        at: note.from,
        ref: note.id,
      });
    }
  }

  return issues.sort(
    (a, b) =>
      a.at - b.at ||
      (a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1),
  );
}

// Text

export interface TextLabels {
  title: string;
  key: (key: string) => string;
  section: (section: SheetSection) => string;
  summary: string;
  notes: string;
  patterns: string;
  pattern: (index: number) => string;
  footnote: (index: number) => string;
}

/**
 * The analysis as plain Markdown: the progression in degrees section by
 * section (chord and degree side by side), the cadences found, the notes
 * and the commentary — to paste in a lesson, a message or a document.
 */
export function analysisToMarkdown(
  input: {
    title: string;
    artist: string | null;
    songKey: string | null;
    sections: readonly SectionProgression[];
    patternCount: number;
    footnoteCount: number;
    summary: string;
  },
  labels: TextLabels,
): string {
  const lines: string[] = [`# ${input.title}`];
  const meta = [input.artist, input.songKey && labels.key(input.songKey)]
    .filter(Boolean)
    .join(" · ");
  if (meta) lines.push("", `_${meta}_`);
  lines.push("", `## ${labels.title}`);
  for (const { section, chords } of input.sections) {
    if (!chords.length) continue;
    lines.push("", `### ${labels.section(section)}`, "");
    const cells = chords.map((c) => {
      const degree = c.degree ? formatDegree(c.degree) : "–";
      const fn = c.fn ? ` (${c.fn})` : "";
      return `${c.symbol} → ${degree}${fn}`;
    });
    lines.push(cells.join(" · "));
  }
  if (input.patternCount) {
    lines.push("", `## ${labels.patterns}`, "");
    for (let i = 0; i < input.patternCount; i++) {
      lines.push(`- ${labels.pattern(i)}`);
    }
  }
  if (input.footnoteCount) {
    lines.push("", `## ${labels.notes}`, "");
    for (let i = 0; i < input.footnoteCount; i++) {
      lines.push(`${i + 1}. ${labels.footnote(i)}`);
    }
  }
  if (input.summary.trim()) {
    lines.push("", `## ${labels.summary}`, "", input.summary.trim());
  }
  return `${lines.join("\n")}\n`;
}
