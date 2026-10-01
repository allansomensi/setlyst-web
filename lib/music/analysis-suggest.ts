/**
 * The analysis assistant: what a harmony teacher would write over a
 * chart on a first reading — the key, where it changes, and each chord's
 * degree, function and marks, with the arrows of its resolutions.
 *
 * The analysis stays the musician's (see lib/music/analysis.ts): nothing
 * here writes into a document on its own. The editor shows these as
 * suggestions — one chord at a time in the inspector, or the whole chart
 * at once in the assistant — and only what the musician accepts is kept,
 * as one step they can undo.
 *
 * Every suggestion reads the chord *in context*, the way books teach it:
 * an A7 before a Dm7 in C is the V7/II, an Ab7 before a G7 the SubV7/V,
 * a Gm7 before C7 → F the IIm7/IV, a C#° between C and Dm7 an ascending
 * diminished. Pure and framework-free.
 */

import { parseKey, spellKey } from "./chords";
import {
  addConnection,
  degreeIsSet,
  emptyEntry,
  keyAt,
  setEntry,
  type ChordBadge,
  type ConnectionKind,
  type Degree,
  type HarmonicAnalysis,
  type HarmonicFunction,
  type Numeral,
  type SheetSection,
} from "./analysis";
import { describeDegree } from "./analysis-concepts";
import {
  chordShape,
  degreeQuality,
  mod12,
  type ChordShape,
  type QualityMode,
  type SeventhKind,
} from "./analysis-theory";

// Keys

/** Diatonic chords of each step, as families, in a major and a minor key. */
function diatonicFit(shape: ChordShape, step: number, minor: boolean): boolean {
  const { family, seventh } = shape;
  const majorish =
    (family === "major" && seventh !== "minor") || family === "suspended";
  const minorish = family === "minor" && seventh !== "major";
  if (!minor) {
    switch (step) {
      case 0:
      case 5:
        return majorish;
      case 2:
      case 4:
      case 9:
        return minorish;
      case 7:
        return majorish || family === "dominant";
      case 11:
        return (
          family === "halfDiminished" ||
          (family === "diminished" && seventh === "none")
        );
      default:
        return false;
    }
  }
  switch (step) {
    case 0:
      return family === "minor";
    case 2:
      return (
        family === "halfDiminished" ||
        (family === "diminished" && seventh === "none")
      );
    case 3:
    case 8:
      return majorish || family === "augmented";
    case 5:
      return minorish;
    case 7:
      // Natural minor's v and harmonic minor's V7.
      return minorish || majorish || family === "dominant";
    case 10:
      return majorish || family === "dominant";
    case 11:
      return family === "diminished";
    default:
      return false;
  }
}

/** The chromatic chords common enough in a key not to count against it. */
function commonChromatic(
  shape: ChordShape,
  step: number,
  minor: boolean,
): boolean {
  if (
    shape.family === "dominant" ||
    (shape.family === "major" && shape.seventh === "none")
  ) {
    // A secondary dominant: resolves onto a diatonic degree.
    const target = mod12(step + 5);
    const targets = minor ? [3, 5, 7, 8, 10] : [2, 4, 5, 7, 9];
    if (targets.includes(target)) return true;
  }
  if (shape.family === "diminished") return true;
  if (!minor) {
    // Modal borrowing from the parallel minor.
    if ([3, 8, 10].includes(step) && shape.family !== "minor") return true;
    if (step === 5 && shape.family === "minor") return true;
    if (step === 2 && shape.family === "halfDiminished") return true;
    if (step === 1 && shape.family === "dominant") return true;
  } else if (step === 1 && shape.family !== "minor") {
    return true;
  }
  return false;
}

/** The tonic chord of a key, as a family. */
function isTonicChord(
  shape: ChordShape,
  tonic: number,
  minor: boolean,
): boolean {
  if (shape.root !== tonic) return false;
  return minor
    ? shape.family === "minor"
    : shape.family === "major" || shape.family === "suspended";
}

/**
 * How well a run of chords sits in a key: diatonic chords count for it,
 * the usual chromatic ones barely against it, anything else against it;
 * starting and ending on the tonic and V → I cadences weigh in favour.
 */
export function keyScore(symbols: readonly string[], key: string): number {
  const parsed = parseKey(key);
  if (!parsed) return -Infinity;
  const shapes = symbols
    .map((symbol) => chordShape(symbol))
    .filter((s): s is ChordShape => s !== null);
  if (!shapes.length) return 0;
  const { pitchClass: tonic, isMinor: minor } = parsed;
  let score = 0;
  shapes.forEach((shape, i) => {
    const step = mod12(shape.root - tonic);
    if (diatonicFit(shape, step, minor)) {
      score += 2;
      if (isTonicChord(shape, tonic, minor)) score += 0.75;
      if (step === 7 && shape.family === "dominant") score += 0.5;
    } else if (commonChromatic(shape, step, minor)) {
      score += 0.25;
    } else {
      score -= 1.5;
    }
    const next = shapes[i + 1];
    if (
      next &&
      isTonicChord(next, tonic, minor) &&
      (shape.family === "dominant" || shape.family === "major") &&
      step === 7
    ) {
      score += 2.5;
    }
  });
  if (isTonicChord(shapes[0], tonic, minor)) score += 2;
  if (isTonicChord(shapes[shapes.length - 1], tonic, minor)) score += 3;
  return score;
}

export interface KeyCandidate {
  key: string;
  score: number;
  /** 0–1: how clearly this key beats the others. */
  confidence: number;
}

/**
 * The likeliest keys of a chord sequence, best first. Relative keys
 * share their chords; the tonic at the edges and the cadences decide
 * between them.
 */
export function detectKey(
  symbols: readonly string[],
  limit = 5,
): KeyCandidate[] {
  const scored: { key: string; score: number }[] = [];
  for (let pc = 0; pc < 12; pc++) {
    for (const minor of [false, true]) {
      const key = spellKey(pc, minor);
      scored.push({ key, score: keyScore(symbols, key) });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const count = symbols.length || 1;
  // Softmax over the scores, tempered by the song's length, so a long
  // song's small margins still read as confident.
  const temperature = Math.max(1.5, Math.sqrt(count));
  const top = scored[0]?.score ?? 0;
  const weights = scored.map((s) => Math.exp((s.score - top) / temperature));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return scored.slice(0, limit).map((s, i) => ({
    ...s,
    confidence: weights[i] / total,
  }));
}

export interface KeyChangeSuggestion {
  /** The chord where the new key starts. */
  at: number;
  key: string;
  /** The key in force before it. */
  from: string;
  /** The section it was found in (index into the sections given). */
  section: number;
}

/**
 * Where the key seems to change: a section that clearly sits in another
 * key (and reaches its tonic) suggests a key mark on its first chord; a
 * later section back in the song's key suggests the return.
 */
export function suggestKeyChanges(
  sections: readonly SheetSection[],
  chords: readonly string[],
  songKey: string,
): KeyChangeSuggestion[] {
  const suggestions: KeyChangeSuggestion[] = [];
  let current = songKey;
  sections.forEach((section, index) => {
    const symbols = section.chords.map((i) => chords[i] ?? "");
    const shapes = symbols.filter((s) => chordShape(s) !== null);
    if (shapes.length < 4) return;
    const [best] = detectKey(shapes, 1);
    if (!best) return;
    const here = keyScore(shapes, current);
    const margin = best.score - here;
    const threshold = 3 + shapes.length * 0.15;
    const reachesTonic = (() => {
      const parsed = parseKey(best.key);
      if (!parsed) return false;
      return shapes.some((s) => {
        const shape = chordShape(s);
        return (
          !!shape && isTonicChord(shape, parsed.pitchClass, parsed.isMinor)
        );
      });
    })();
    if (best.key !== current && margin >= threshold && reachesTonic) {
      suggestions.push({
        at: section.chords[0],
        key: best.key,
        from: current,
        section: index,
      });
      current = best.key;
      return;
    }
    // Back home: the song's key fits this section about as well again.
    if (current !== songKey) {
      const home = keyScore(shapes, songKey);
      if (home >= best.score - 1 && home > here) {
        suggestions.push({
          at: section.chords[0],
          key: songKey,
          from: current,
          section: index,
        });
        current = songKey;
      }
    }
  });
  return suggestions;
}

// Degrees

export type SuggestionReason =
  | "diatonic"
  | "dominant"
  | "secondaryDominant"
  | "unresolvedDominant"
  | "substitute"
  | "backdoor"
  | "relatedTwo"
  | "borrowed"
  | "neapolitan"
  | "diminishedAscending"
  | "diminishedDescending"
  | "diminishedAuxiliary"
  | "diminished"
  | "approach"
  | "chromatic";

export type Confidence = "high" | "medium" | "low";

export interface ChordSuggestion {
  index: number;
  degree: Degree;
  fn: HarmonicFunction | null;
  badges: ChordBadge[];
  reason: SuggestionReason;
  confidence: Confidence;
  /** The key it was read in. */
  key: string;
}

export interface ConnectionSuggestion {
  from: number;
  to: number;
  kind: ConnectionKind;
}

export interface SuggestOptions {
  /** How qualities are written (see `degreeQuality`). */
  qualityMode?: QualityMode;
  /** Keep the chord's written tensions in the degree ("V7(b9)"). */
  tensions?: boolean;
}

/** The step's numeral, as a major key spells it by default. */
const PLAIN_STEPS: Record<number, [string, Numeral]> = {
  0: ["", "I"],
  1: ["b", "II"],
  2: ["", "II"],
  3: ["b", "III"],
  4: ["", "III"],
  5: ["", "IV"],
  6: ["#", "IV"],
  7: ["", "V"],
  8: ["b", "VI"],
  9: ["", "VI"],
  10: ["b", "VII"],
  11: ["", "VII"],
};

/** Spelled upwards: the chromatic steps as raised numerals (#I, #II...). */
const SHARP_STEPS: Record<number, [string, Numeral]> = {
  ...PLAIN_STEPS,
  1: ["#", "I"],
  3: ["#", "II"],
  6: ["#", "IV"],
  8: ["#", "V"],
  10: ["#", "VI"],
};

/** Spelled downwards: lowered numerals (bII, bIII, bV...). */
const FLAT_STEPS: Record<number, [string, Numeral]> = {
  ...PLAIN_STEPS,
  6: ["b", "V"],
};

function numeralOf(
  step: number,
  spelling: "plain" | "sharp" | "flat" = "plain",
): { accidental: Degree["accidental"]; numeral: Numeral } {
  const table =
    spelling === "sharp"
      ? SHARP_STEPS
      : spelling === "flat"
        ? FLAT_STEPS
        : PLAIN_STEPS;
  const [accidental, numeral] = table[mod12(step)];
  return { accidental: accidental as Degree["accidental"], numeral };
}

/** A step as a target after the slash ("II", "bVI"). */
function targetOf(step: number): string {
  const { accidental, numeral } = numeralOf(step);
  return `${accidental}${numeral}`;
}

interface Context {
  index: number;
  shape: ChordShape;
}

/** The seventh a chord on this step takes in the key's field. */
function seventhHint(
  shape: ChordShape,
  step: number,
  minor: boolean,
): SeventhKind | undefined {
  if (shape.family !== "major") return undefined;
  if (minor) return [7, 10, 5].includes(step) ? "minor" : "major";
  return step === 7 || step === 10 ? "minor" : "major";
}

function dominantLike(
  shape: ChordShape,
  step: number,
  minor: boolean,
  next: Context | null,
): boolean {
  if (shape.family === "dominant") return true;
  // A plain major triad off the key's major degrees, a fifth above where
  // it goes: the triad form of a secondary dominant ("A" → "Dm" in C).
  if (shape.family !== "major" || shape.seventh !== "none" || shape.sixth) {
    return false;
  }
  if (!next || mod12(shape.root - next.shape.root) !== 7) return false;
  // The I and IV of a major key (III, VI and VII of a minor one) moving
  // down a fifth are just moving; anything else is heading somewhere.
  const majorSteps = minor ? [3, 8, 10] : [0, 5];
  return !majorSteps.includes(step);
}

/**
 * The degree a chord most likely is, read with its neighbours. Null for
 * what isn't a chord, or when there is no key to read it in.
 */
export function suggestChord(
  chords: readonly string[],
  index: number,
  key: string | null,
  neighbours: { previous: Context | null; next: Context | null },
  options: SuggestOptions = {},
): ChordSuggestion | null {
  const shape = chordShape(chords[index] ?? "");
  const parsed = parseKey(key);
  if (!shape || !parsed || !key) return null;
  const tonic = parsed.pitchClass;
  const minor = parsed.isMinor;
  const step = mod12(shape.root - tonic);
  const { previous, next } = neighbours;
  const mode = options.qualityMode ?? "written";
  const quality = (hint?: SeventhKind) =>
    degreeQuality(shape, mode, {
      tensions: options.tensions,
      seventhHint: hint ?? seventhHint(shape, step, minor),
    });
  const make = (
    degree: Omit<Degree, "quality"> & { quality?: string },
    rest: Partial<Omit<ChordSuggestion, "index" | "degree" | "key">> & {
      reason: SuggestionReason;
    },
  ): ChordSuggestion => {
    const full: Degree = { quality: quality(), ...degree };
    const concept = describeDegree(full, minor);
    return {
      index,
      degree: full,
      fn: rest.fn !== undefined ? rest.fn : (concept?.fn ?? null),
      badges: rest.badges ?? [],
      reason: rest.reason,
      confidence: rest.confidence ?? "high",
      key,
    };
  };

  const toNext = next ? mod12(shape.root - next.shape.root) : null;
  const nextStep = next ? mod12(next.shape.root - tonic) : null;

  // Dominants: primary, secondary, substitute, backdoor.
  if (dominantLike(shape, step, minor, next)) {
    const fifthDown = toNext === 7;
    const halfDown = toNext === 1;
    const dominantQuality = quality("minor");
    if (step === 7 && !halfDown) {
      return make(
        {
          sub: false,
          accidental: "",
          numeral: "V",
          quality: dominantQuality,
          target: "",
        },
        {
          reason: "dominant",
          fn: "D",
          confidence: fifthDown || !next ? "high" : "medium",
        },
      );
    }
    if (fifthDown && nextStep !== null) {
      return make(
        {
          sub: false,
          accidental: "",
          numeral: "V",
          quality: dominantQuality,
          target: targetOf(nextStep),
        },
        { reason: "secondaryDominant", fn: "D" },
      );
    }
    if (halfDown && nextStep !== null) {
      return make(
        {
          sub: true,
          accidental: "",
          numeral: "V",
          quality: dominantQuality,
          target: nextStep === 0 ? "" : targetOf(nextStep),
        },
        { reason: "substitute", fn: "D" },
      );
    }
    if (step === 10 && shape.family === "dominant") {
      const home = nextStep === 0;
      return make(
        {
          sub: false,
          accidental: "b",
          numeral: "VII",
          quality: dominantQuality,
          target: "",
        },
        {
          reason: home ? "backdoor" : "borrowed",
          fn: "SD",
          badges: minor ? [] : ["aem"],
          confidence: home ? "high" : "medium",
        },
      );
    }
    if (step === 1 && shape.family === "dominant") {
      return make(
        {
          sub: true,
          accidental: "",
          numeral: "V",
          quality: dominantQuality,
          target: "",
        },
        { reason: "substitute", fn: "D", confidence: "low" },
      );
    }
    const expected = mod12(step + 5);
    const targets = minor ? [3, 5, 7, 8, 10] : [2, 4, 5, 7, 9];
    if (shape.family === "dominant" && targets.includes(expected)) {
      return make(
        {
          sub: false,
          accidental: "",
          numeral: "V",
          quality: dominantQuality,
          target: targetOf(expected),
        },
        { reason: "unresolvedDominant", fn: "D", confidence: "medium" },
      );
    }
  }

  // Diminished chords, told apart by how they move.
  if (shape.family === "diminished") {
    const nextRoot = next?.shape.root;
    if (nextRoot !== undefined && mod12(nextRoot - shape.root) === 1) {
      return make(
        { sub: false, ...numeralOf(step, "sharp"), target: "" },
        {
          reason: "diminishedAscending",
          fn: "D",
          badges: ["dimAsc"],
        },
      );
    }
    if (nextRoot !== undefined && mod12(shape.root - nextRoot) === 1) {
      return make(
        { sub: false, ...numeralOf(step, "flat"), target: "" },
        {
          reason: "diminishedDescending",
          fn: null,
          badges: ["dimDesc"],
        },
      );
    }
    if (
      (nextRoot !== undefined && nextRoot === shape.root) ||
      previous?.shape.root === shape.root
    ) {
      return make(
        { sub: false, ...numeralOf(step), target: "" },
        { reason: "diminishedAuxiliary", fn: null, badges: ["dimAux"] },
      );
    }
    return make(
      { sub: false, ...numeralOf(step, "sharp"), target: "" },
      { reason: "diminished", confidence: "low" },
    );
  }

  const diatonic = diatonicFit(shape, step, minor);

  // The II of a II–V: a minor (or half-diminished) chord a fourth below a
  // dominant. Off the key, it's written as the II of where the V goes.
  if (
    (shape.family === "minor" || shape.family === "halfDiminished") &&
    next &&
    mod12(next.shape.root - shape.root) === 5 &&
    next.shape.family === "dominant"
  ) {
    const resolution = mod12(next.shape.root + 5 - tonic);
    if (!diatonic && resolution !== 0) {
      return make(
        {
          sub: false,
          accidental: "",
          numeral: "II",
          target: targetOf(resolution),
        },
        { reason: "relatedTwo", fn: "SD" },
      );
    }
  }

  // A plain degree: diatonic, borrowed, or chromatic.
  const spelling =
    shape.family === "halfDiminished" && step === 6 ? "sharp" : "plain";
  const plain = make(
    { sub: false, ...numeralOf(step, spelling), target: "" },
    { reason: "diatonic" },
  );
  if (diatonic) return plain;

  const concept = describeDegree(plain.degree, minor);
  if (concept?.id === "neapolitan") {
    return { ...plain, reason: "neapolitan", badges: minor ? [] : ["aem"] };
  }
  if (concept?.id === "modalBorrowing" || concept?.id === "subdominantMinor") {
    return { ...plain, reason: "borrowed", badges: ["aem"] };
  }
  // A chromatic chord a half step from where it goes, of the same kind:
  // an approach chord (Ebm7 → Dm7).
  if (
    next &&
    (toNext === 1 || toNext === 11) &&
    next.shape.family === shape.family
  ) {
    return {
      ...plain,
      reason: "approach",
      fn: null,
      badges: ["approach"],
      confidence: "medium",
    };
  }
  return { ...plain, reason: "chromatic", confidence: "low" };
}

export interface AnalysisSuggestions {
  chords: ChordSuggestion[];
  connections: ConnectionSuggestion[];
}

/**
 * A reading of the whole chart: a suggestion for every chord with a key
 * to be read in (the key marks of `analysis`, else `songKey`), and the
 * arrows and brackets they imply.
 */
export function suggestAnalysis(
  chords: readonly string[],
  analysis: HarmonicAnalysis,
  songKey: string | null,
  options: SuggestOptions = {},
): AnalysisSuggestions {
  const shapes = chords.map((symbol) => chordShape(symbol));
  const keys = chords.map((_, i) => keyAt(analysis, i, songKey));

  // The analysable chords next to each one, in the same key: crossing
  // into another key ends the context.
  const neighbour = (i: number, direction: 1 | -1): Context | null => {
    for (let j = i + direction; j >= 0 && j < chords.length; j += direction) {
      if (keys[j] !== keys[i]) return null;
      const shape = shapes[j];
      if (shape) return { index: j, shape };
    }
    return null;
  };

  const result: ChordSuggestion[] = [];
  const contexts = chords.map((_, i) => ({
    previous: neighbour(i, -1),
    next: neighbour(i, 1),
  }));
  chords.forEach((_, i) => {
    const suggestion = suggestChord(chords, i, keys[i], contexts[i], options);
    if (suggestion) result.push(suggestion);
  });

  addRunBadges(result, shapes);

  // Arrows and brackets.
  const byIndex = new Map(result.map((s) => [s.index, s]));
  const connections: ConnectionSuggestion[] = [];
  for (const suggestion of result) {
    const next = contexts[suggestion.index].next;
    if (!next) continue;
    const to = byIndex.get(next.index);
    const interval = mod12(
      (shapes[suggestion.index]?.root ?? 0) - next.shape.root,
    );
    switch (suggestion.reason) {
      case "dominant":
      case "secondaryDominant":
        if (interval === 7) {
          connections.push({
            from: suggestion.index,
            to: next.index,
            kind: "dominant",
          });
        } else if (
          suggestion.reason === "dominant" &&
          to &&
          !to.degree.target &&
          (to.degree.numeral === "VI" || to.degree.numeral === "III") &&
          (to.degree.accidental === "" || to.degree.accidental === "b")
        ) {
          connections.push({
            from: suggestion.index,
            to: next.index,
            kind: "deceptive",
          });
        }
        break;
      case "substitute":
        if (interval === 1) {
          connections.push({
            from: suggestion.index,
            to: next.index,
            kind: "subV",
          });
        }
        break;
      case "backdoor":
        connections.push({
          from: suggestion.index,
          to: next.index,
          kind: "dominant",
        });
        break;
      default:
        break;
    }
    const family = shapes[suggestion.index]?.family;
    if (
      (family === "minor" || family === "halfDiminished") &&
      to &&
      (to.reason === "dominant" ||
        to.reason === "secondaryDominant" ||
        to.reason === "unresolvedDominant") &&
      mod12(next.shape.root - (shapes[suggestion.index]?.root ?? 0)) === 5
    ) {
      connections.push({
        from: suggestion.index,
        to: next.index,
        kind: "twoFive",
      });
      // The II of a secondary II–V prepares that V: subdominant there,
      // whatever it is in the key (the IIIm7 of IIIm7 → V7/II).
      if (to.reason !== "dominant") suggestion.fn = "SD";
    }
  }

  return { chords: result, connections };
}

/**
 * Marks that only a run of chords shows: a pedal (the same bass under
 * changing chords) and a cliché (the same chord with one voice moving:
 * Am, Am7M, Am7, Am6).
 */
function addRunBadges(
  suggestions: ChordSuggestion[],
  shapes: readonly (ChordShape | null)[],
) {
  const at = new Map(suggestions.map((s) => [s.index, s]));
  const mark = (indexes: number[], badge: ChordBadge) => {
    for (const i of indexes) {
      const s = at.get(i);
      if (s && !s.badges.includes(badge)) s.badges = [...s.badges, badge];
    }
  };

  let run: number[] = [];
  const flushPedal = () => {
    const slashed = run.filter((i) => {
      const shape = shapes[i];
      return shape && shape.bass !== null && shape.bass !== shape.root;
    });
    const roots = new Set(run.map((i) => shapes[i]?.root));
    if (run.length >= 3 && slashed.length > 0 && roots.size > 1) {
      mark(slashed, "pedal");
    }
    run = [];
  };
  shapes.forEach((shape, i) => {
    if (!shape) return flushPedal();
    const bass = shape.bass ?? shape.root;
    const last = run.length ? shapes[run[run.length - 1]] : null;
    if (last && (last.bass ?? last.root) !== bass) flushPedal();
    run.push(i);
  });
  flushPedal();

  let cliche: number[] = [];
  const flushCliche = () => {
    const symbols = new Set(cliche.map((i) => shapes[i]?.symbol));
    if (cliche.length >= 3 && symbols.size >= 3) mark(cliche, "cliche");
    cliche = [];
  };
  shapes.forEach((shape, i) => {
    if (!shape) return flushCliche();
    const last = cliche.length ? shapes[cliche[cliche.length - 1]] : null;
    const triadOf = (s: ChordShape) =>
      s.triad === "augmented" ? "major" : s.triad;
    if (
      last &&
      (last.root !== shape.root || triadOf(last) !== triadOf(shape))
    ) {
      flushCliche();
    }
    cliche.push(i);
  });
  flushCliche();
}

// Applying

export interface ApplyOptions {
  /** Overwrite what's already written, or only fill what's empty. */
  overwrite: boolean;
  degrees: boolean;
  functions: boolean;
  marks: boolean;
  connections: boolean;
  /** Only these chords (inclusive); all when null. */
  range?: [number, number] | null;
}

export interface ApplyCounts {
  degrees: number;
  functions: number;
  marks: number;
  connections: number;
}

/**
 * Writes accepted suggestions into an analysis. Nothing already written
 * is touched unless `overwrite` says so, and lines are only added where
 * two chords aren't joined yet.
 */
export function applySuggestions(
  analysis: HarmonicAnalysis,
  suggestions: AnalysisSuggestions,
  options: ApplyOptions,
): { analysis: HarmonicAnalysis; counts: ApplyCounts } {
  const counts: ApplyCounts = {
    degrees: 0,
    functions: 0,
    marks: 0,
    connections: 0,
  };
  const inRange = (i: number) =>
    !options.range || (i >= options.range[0] && i <= options.range[1]);
  let next = analysis;

  for (const s of suggestions.chords) {
    if (!inRange(s.index)) continue;
    const entry = next.entries[String(s.index)] ?? emptyEntry();
    const patch: Partial<typeof entry> = {};
    if (options.degrees && (options.overwrite || !degreeIsSet(entry.degree))) {
      patch.degree = { ...s.degree };
      counts.degrees++;
    }
    if (options.functions && s.fn && (options.overwrite || !entry.fn)) {
      if (entry.fn !== s.fn) {
        patch.fn = s.fn;
        counts.functions++;
      }
    }
    if (options.marks && s.badges.length) {
      const missing = s.badges.filter((b) => !entry.badges.includes(b));
      if (missing.length) {
        patch.badges = [...entry.badges, ...missing];
        counts.marks += missing.length;
      }
    }
    if (Object.keys(patch).length) next = setEntry(next, s.index, patch);
  }

  if (options.connections) {
    for (const c of suggestions.connections) {
      if (!inRange(c.from) || !inRange(c.to)) continue;
      const joined = next.connections.some(
        (o) =>
          (o.from === c.from && o.to === c.to) ||
          (o.from === c.to && o.to === c.from),
      );
      if (joined) continue;
      const before = next;
      next = addConnection(next, c.from, c.to, c.kind);
      if (next !== before) counts.connections++;
    }
  }

  return { analysis: next, counts };
}
