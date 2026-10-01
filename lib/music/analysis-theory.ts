/**
 * The theory a harmonic analysis is written against: what a chord symbol
 * is made of (its family, as the analysis reads it), how a key's degrees
 * are spelled, the harmonic fields a harmony book tabulates (the major
 * key's, the three minor ones', the secondary dominants and their
 * substitutes, the chords of modal borrowing), and the scale each chord
 * implies — with its available tensions and avoid notes.
 *
 * Everything here is a *reference*: the inspector and the field table
 * show it, the assistant (analysis-suggest.ts) proposes from it, and the
 * musician decides. Pure and framework-free.
 */

import { chordNotes, type ChordNotes } from "./chord-theory";
import { parseKey } from "./chords";
import {
  describeDegree,
  qualityOf,
  rootOf,
  type ChordQuality,
} from "./analysis-concepts";
import {
  degreeIsSet,
  formatDegree,
  parseDegree,
  type Degree,
  type HarmonicFunction,
} from "./analysis";

export const mod12 = (n: number) => ((n % 12) + 12) % 12;

// Spelling

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_PITCH = [0, 2, 4, 5, 7, 9, 11] as const;
const SHARPS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
const FLATS = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

/** A pitch class by name, with sharps or flats. */
export function pitchName(pitchClass: number, flats: boolean): string {
  return (flats ? FLATS : SHARPS)[mod12(pitchClass)];
}

/**
 * Spells the note `steps` letters and `semitones` above a note: the
 * third of E is G#, never Ab. Falls back to a plain name beyond a double
 * accidental.
 */
export function spellInterval(
  fromName: string,
  steps: number,
  semitones: number,
  flats = false,
): string {
  const match = /^([A-G])([#b]{0,2})/.exec(fromName);
  if (!match) return pitchName(semitones, flats);
  const letterIndex = LETTERS.indexOf(match[1] as (typeof LETTERS)[number]);
  const from =
    LETTER_PITCH[letterIndex] +
    [...match[2]].reduce((n, c) => n + (c === "#" ? 1 : -1), 0);
  const targetLetter = (letterIndex + steps) % 7;
  const target = mod12(from + semitones);
  let offset = mod12(target - LETTER_PITCH[targetLetter]);
  if (offset > 6) offset -= 12;
  if (Math.abs(offset) > 2) return pitchName(target, flats);
  return `${LETTERS[targetLetter]}${offset > 0 ? "#".repeat(offset) : "b".repeat(-offset)}`;
}

/** The tonic of a key name ("F#m" → "F#"). */
export function keyTonicName(key: string): string {
  return key.replace(/m$/, "");
}

/** Whether a key is written with flats (F, Bb, Dm, Cm...). */
export function keyUsesFlats(key: string | null): boolean {
  if (!key) return false;
  const tonic = keyTonicName(key);
  if (tonic.includes("b")) return true;
  const parsed = parseKey(key);
  if (!parsed) return false;
  // Natural tonics with flats in the signature: F major, D/G/C/F minor.
  return parsed.isMinor
    ? [0, 2, 5, 7].includes(parsed.pitchClass)
    : parsed.pitchClass === 5;
}

const NUMERAL_STEPS: Record<string, number> = {
  I: 0,
  II: 1,
  III: 2,
  IV: 3,
  V: 4,
  VI: 5,
  VII: 6,
};

/**
 * The root of a degree in a key, spelled by its numeral: in Eb, bVII is
 * Db and in E, #IV is A#. Null when the degree has no plain place in the
 * key (a secondary target is resolved through `rootOf`).
 */
export function degreeRootName(degree: Degree, key: string): string | null {
  const name = spellDegreeRoot(degree, key);
  if (!name) return null;
  const diatonic = !degree.accidental && !degree.target && !degree.sub;
  return diatonic ? name : plainSpelling(name, keyUsesFlats(key));
}

/**
 * A chromatic chord spelled the way charts write it: E7 rather than Fb7
 * and A rather than Bbb, whatever the theory would call it.
 */
export function plainSpelling(name: string, flats: boolean): string {
  if (!/^[A-G](?:##|bb|#|b)?$/.test(name)) return name;
  if (!/(##|bb|^E#|^B#|^Fb|^Cb)/.test(name)) return name;
  const letter = "CDEFGAB".indexOf(name[0]);
  const pc =
    [0, 2, 4, 5, 7, 9, 11][letter] +
    [...name.slice(1)].reduce((n, c) => n + (c === "#" ? 1 : -1), 0);
  return pitchName(pc, flats);
}

function spellDegreeRoot(degree: Degree, key: string): string | null {
  const parsed = parseKey(key);
  if (!parsed || !degreeIsSet(degree)) return null;
  const root = rootOf(degree);
  if (root === null) return null;
  const tonic = keyTonicName(key);
  const flats = keyUsesFlats(key);
  if (!degree.target && !degree.sub) {
    const steps = NUMERAL_STEPS[degree.numeral];
    return spellInterval(tonic, steps, root, flats);
  }
  // A secondary degree: spelled from where it lands, a fifth above (or a
  // half step above, for a substitute) its target.
  const target = degree.target
    ? numeralSteps(degree.target)
    : { steps: 0, semitones: 0 };
  if (target === null) return pitchName(parsed.pitchClass + root, flats);
  const targetName = spellInterval(
    tonic,
    target.steps,
    target.semitones,
    flats,
  );
  if (degree.sub) return spellInterval(targetName, 1, 1, true);
  const own = NUMERAL_STEPS[degree.numeral];
  const ownSemitones = mod12(root - target.semitones);
  return spellInterval(targetName, own, ownSemitones, flats);
}

function numeralSteps(
  text: string,
): { steps: number; semitones: number } | null {
  const match = /^([b#]?)(VII|VI|V|IV|III|II|I)/.exec(text);
  if (!match) return null;
  const steps = NUMERAL_STEPS[match[2]];
  const base = [0, 2, 4, 5, 7, 9, 11][steps];
  const shift = match[1] === "b" ? -1 : match[1] === "#" ? 1 : 0;
  return { steps, semitones: mod12(base + shift) };
}

// Chord shape

export type SeventhKind = "none" | "minor" | "major" | "diminished";

export interface ChordShape {
  symbol: string;
  root: number;
  rootName: string;
  bass: number | null;
  bassName: string | null;
  family: ChordQuality;
  /** The triad underneath. */
  triad:
    "major" | "minor" | "diminished" | "augmented" | "sus4" | "sus2" | "power";
  seventh: SeventhKind;
  sixth: boolean;
  /** Fifth altered on a seventh chord: "b5" or "#5". */
  fifth: "" | "b5" | "#5";
  /** Written tensions, as labels ("9", "b9", "#11", "13"). */
  tensions: string[];
  notes: ChordNotes;
}

const TENSION_LABEL: Record<number, string> = {
  13: "b9",
  14: "9",
  15: "#9",
  17: "11",
  18: "#11",
  20: "b13",
  21: "13",
};

/**
 * A chord symbol as the analysis reads it: family, triad, seventh,
 * tensions. Null for anything that isn't a chord ("N.C.").
 */
export function chordShape(symbol: string): ChordShape | null {
  const notes = chordNotes(symbol);
  if (!notes) return null;
  const has = (semitones: number, degree?: number) =>
    notes.tones.some(
      (t) =>
        t.semitones === semitones &&
        (degree === undefined || t.degree === degree),
    );
  const third = notes.tones.find((t) => [2, 3, 4].includes(t.degree));
  const fifthTone = notes.tones.find((t) => t.degree === 5);
  const seventhTone = notes.tones.find((t) => t.degree === 7);

  const thirdKind =
    third?.degree === 3
      ? third.semitones === 3
        ? "minor"
        : "major"
      : third?.degree === 4
        ? "sus4"
        : third?.degree === 2
          ? "sus2"
          : null;
  const fifth = fifthTone?.semitones ?? 7;

  const seventh: SeventhKind =
    seventhTone === undefined
      ? "none"
      : seventhTone.semitones === 11
        ? "major"
        : seventhTone.semitones === 9
          ? "diminished"
          : "minor";

  let triad: ChordShape["triad"];
  if (thirdKind === null) triad = "power";
  else if (thirdKind === "sus4" || thirdKind === "sus2") triad = thirdKind;
  else if (thirdKind === "minor") triad = fifth === 6 ? "diminished" : "minor";
  else triad = fifth === 8 ? "augmented" : "major";

  let family: ChordQuality;
  if (triad === "diminished") {
    family = seventh === "minor" ? "halfDiminished" : "diminished";
  } else if (
    seventh === "minor" &&
    (triad === "major" ||
      triad === "augmented" ||
      triad === "sus4" ||
      triad === "sus2")
  ) {
    family = "dominant";
  } else if (triad === "augmented" && seventh !== "major") {
    family = "augmented";
  } else if (triad === "minor") {
    family = "minor";
  } else if (triad === "sus4" || triad === "sus2") {
    family = "suspended";
  } else {
    family = "major";
  }

  const sixth =
    notes.tones.some((t) => t.degree === 6) || (seventh === "none" && has(21));
  const tensions = notes.tones
    .filter((t) => t.semitones > 12 && TENSION_LABEL[t.semitones])
    .map((t) => TENSION_LABEL[t.semitones]);

  return {
    symbol: notes.symbol,
    root: notes.rootPitchClass,
    rootName: notes.rootName,
    bass: notes.bassPitchClass,
    bassName: notes.bassName,
    family,
    triad,
    seventh,
    sixth,
    fifth:
      seventh !== "none" &&
      family !== "halfDiminished" &&
      family !== "diminished"
        ? fifth === 6
          ? "b5"
          : fifth === 8
            ? "#5"
            : ""
        : "",
    tensions,
    notes,
  };
}

/** How a degree's quality is written from a chord. */
export type QualityMode = "written" | "triads" | "tetrads";

/**
 * The quality of a degree as Brazilian harmony books write it ("7M",
 * "m7", "7", "m7(b5)", "°", "m6", "7(b9)"), from a chord's shape.
 *
 * - `written`: what the chord is, a triad for a triad;
 * - `triads`: only the triad;
 * - `tetrads`: a seventh always, the one the degree implies when the
 *   chart left it out (`seventhHint`).
 */
export function degreeQuality(
  shape: ChordShape,
  mode: QualityMode = "written",
  options: { tensions?: boolean; seventhHint?: SeventhKind } = {},
): string {
  let seventh = shape.seventh;
  if (mode === "triads") seventh = "none";
  if (mode === "tetrads" && seventh === "none" && !shape.sixth) {
    seventh = options.seventhHint ?? defaultSeventh(shape);
  }
  const sixth = mode !== "triads" && shape.sixth && seventh === "none";
  const extras: string[] = [];
  if (mode !== "triads" && shape.fifth) extras.push(shape.fifth);
  if (options.tensions && mode !== "triads") {
    for (const t of shape.tensions) {
      // A sixth chord's 13 is its sixth, already written.
      if (sixth && t === "13") continue;
      extras.push(t);
    }
  }

  let base: string;
  switch (shape.family) {
    case "diminished":
      base = "°";
      break;
    case "halfDiminished":
      return mode === "triads"
        ? "m(b5)"
        : withExtras("m7", ["b5", ...extras.filter((e) => e !== "b5")]);
    case "augmented":
      base = seventh === "minor" ? "7" : "+";
      if (seventh === "minor") extras.unshift("#5");
      break;
    case "minor":
      base =
        seventh === "major"
          ? "m7M"
          : seventh === "minor"
            ? "m7"
            : sixth
              ? "m6"
              : "m";
      break;
    case "dominant":
      base =
        mode === "triads"
          ? shape.triad === "sus4"
            ? "sus4"
            : ""
          : shape.triad === "sus4" || shape.triad === "sus2"
            ? "7sus4"
            : "7";
      break;
    case "suspended":
      base =
        seventh === "minor"
          ? "7sus4"
          : shape.triad === "sus2"
            ? "sus2"
            : "sus4";
      break;
    default:
      base =
        seventh === "major"
          ? "7M"
          : seventh === "minor"
            ? "7"
            : sixth
              ? "6"
              : shape.triad === "augmented"
                ? "+"
                : "";
  }
  return withExtras(base, mode === "triads" ? [] : extras);
}

function withExtras(base: string, extras: string[]): string {
  const unique = [...new Set(extras)];
  if (!unique.length) return base;
  const full = `${base}(${unique.join(",")})`;
  // Degrees are short (LIMITS.quality): drop tensions rather than cut one.
  return full.length <= 16 ? full : base;
}

function defaultSeventh(shape: ChordShape): SeventhKind {
  switch (shape.family) {
    case "minor":
    case "dominant":
    case "halfDiminished":
    case "suspended":
      return "minor";
    case "diminished":
      return "diminished";
    default:
      return "major";
  }
}

// Scales

export const SCALES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  locrianNat2: [0, 2, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  mixolydianB13: [0, 2, 4, 5, 7, 8, 10],
  mixolydianB9B13: [0, 1, 4, 5, 7, 8, 10],
  lydianDominant: [0, 2, 4, 6, 7, 9, 10],
  lydianAugmented: [0, 2, 4, 6, 8, 9, 11],
  ionianAugmented: [0, 2, 4, 5, 8, 9, 11],
  locrianNat6: [0, 1, 3, 5, 6, 9, 10],
  dorianSharp4: [0, 2, 3, 6, 7, 9, 10],
  altered: [0, 1, 3, 4, 6, 8, 10],
  dominantDiminished: [0, 1, 3, 4, 6, 7, 9, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
  dorianB2: [0, 1, 3, 5, 7, 9, 10],
} as const satisfies Record<string, readonly number[]>;

export type ScaleId = keyof typeof SCALES;

const SCALE_ORDER: ScaleId[] = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
  "locrianNat2",
  "harmonicMinor",
  "melodicMinor",
  "mixolydianB13",
  "mixolydianB9B13",
  "lydianDominant",
  "lydianAugmented",
  "ionianAugmented",
  "locrianNat6",
  "dorianSharp4",
  "altered",
  "dorianB2",
  "dominantDiminished",
  "diminished",
  "wholeTone",
];

/** The scale whose intervals are exactly `intervals`, or null. */
export function identifyScale(intervals: readonly number[]): ScaleId | null {
  const set = [...new Set(intervals.map(mod12))].sort((a, b) => a - b);
  for (const id of SCALE_ORDER) {
    const scale = SCALES[id];
    if (
      scale.length === set.length &&
      scale.every((value, i) => value === set[i])
    ) {
      return id;
    }
  }
  return null;
}

export type SourceKind =
  "major" | "naturalMinor" | "harmonicMinor" | "melodicMinor" | "phrygian";

const SOURCE_SCALE: Record<SourceKind, readonly number[]> = {
  major: SCALES.ionian,
  naturalMinor: SCALES.aeolian,
  harmonicMinor: SCALES.harmonicMinor,
  melodicMinor: SCALES.melodicMinor,
  phrygian: SCALES.phrygian,
};

/** A scale's notes on a tonic. */
function keyScale(tonic: number, kind: SourceKind): number[] {
  return SOURCE_SCALE[kind].map((i) => mod12(tonic + i));
}

/**
 * The notes a chord is heard against. In a major key, the key itself —
 * except for a chord borrowed from the parallel minor (or, for the bII,
 * from the phrygian). In a minor key, the first of the minor scales (or
 * the parallel major) that holds every note of the chord: the V7 and the
 * VII° come from the harmonic minor, the IV7 from the melodic.
 */
function sourceScale(
  shape: ChordShape,
  degree: Degree | null,
  tonic: number,
  minorKey: boolean,
  explicit?: SourceKind,
): number[] {
  if (explicit) return keyScale(tonic, explicit);
  const pcs = shape.notes.tones.map((t) => mod12(shape.root + t.semitones));
  const fits = (kind: SourceKind) => {
    const scale = keyScale(tonic, kind);
    return pcs.every((pc) => scale.includes(pc));
  };
  const secondary = !!degree?.target || !!degree?.sub;
  if (!minorKey) {
    if (secondary || fits("major")) return keyScale(tonic, "major");
    const step = mod12(shape.root - tonic);
    if (step === 1 && fits("phrygian")) return keyScale(tonic, "phrygian");
    if (fits("naturalMinor")) return keyScale(tonic, "naturalMinor");
    return keyScale(tonic, "major");
  }
  if (secondary) return keyScale(tonic, "naturalMinor");
  for (const kind of [
    "naturalMinor",
    "harmonicMinor",
    "melodicMinor",
    "major",
  ] as const) {
    if (fits(kind)) return keyScale(tonic, kind);
  }
  return keyScale(tonic, "naturalMinor");
}

export interface ScaleTone {
  /** Semitones above the chord's root. */
  semitones: number;
  /** The note, spelled from the root. */
  name: string;
  /** "1", "b3", "#11"... */
  label: string;
  role: "chord" | "tension" | "avoid";
}

export interface ChordScale {
  id: ScaleId | null;
  root: number;
  rootName: string;
  tones: ScaleTone[];
  /** Other scales that fit, the commonest first. */
  alternatives: ScaleId[];
}

/**
 * The scale a chord implies in its context — Berklee's chord-scale
 * method, as Brazilian harmony books apply it: the chord's own tones,
 * filled with the notes of where it comes from (the key; the parallel
 * minor for a borrowed chord; harmonic minor for a minor key's
 * dominant). Substitute dominants and the bVII7 take the lydian b7,
 * diminished chords the whole-half diminished, augmented ones the whole
 * tone, and an altered dominant the altered scale.
 */
export function chordScale(
  shape: ChordShape,
  degree: Degree | null,
  key: string | null,
  /** The scale the chord is drawn from, when the context says (a field). */
  sourceKind?: SourceKind,
): ChordScale | null {
  const parsedKey = parseKey(key);
  const root = shape.root;
  const flats = keyUsesFlats(key) || /b/.test(shape.rootName);
  const minorKey = !!parsedKey?.isMinor;
  const tonic = parsedKey?.pitchClass ?? root;

  const result = (id: ScaleId, alternatives: ScaleId[] = []): ChordScale =>
    describeScale(shape, [...SCALES[id]], id, alternatives, flats);

  if (shape.family === "diminished") return result("diminished");
  if (shape.family === "augmented")
    return result("wholeTone", ["lydianAugmented"]);
  if (shape.family === "dominant") {
    const t = shape.tensions;
    if (t.includes("#9") && (t.includes("b13") || shape.fifth === "#5"))
      return result("altered", ["dominantDiminished"]);
    if (t.includes("b9") && t.includes("13"))
      return result("dominantDiminished", ["mixolydianB9B13"]);
    if (t.includes("#11") || shape.fifth === "b5")
      return result("lydianDominant", ["wholeTone"]);
    if (shape.fifth === "#5") return result("wholeTone", ["altered"]);
    if (degree?.sub) return result("lydianDominant", ["altered"]);
    if (parsedKey && degreeIsSet(degree)) {
      const step = mod12(root - tonic);
      if (!degree.target && step === 10 && !minorKey)
        return result("lydianDominant", ["mixolydian"]);
    }
    if (shape.triad === "sus4" || shape.triad === "sus2") {
      return result("mixolydian", ["dorian"]);
    }
  }

  // Where the chord comes from decides the notes around it.
  const source = parsedKey
    ? sourceScale(shape, degree, tonic, minorKey, sourceKind)
    : defaultSource(shape);

  const intervals = fillScale(
    shape,
    source.map((pc) => mod12(pc - root)),
  );
  const id = identifyScale(intervals);
  const alternatives = alternativesFor(shape, id);
  return describeScale(shape, intervals, id, alternatives, flats);
}

/** Notes around a chord with no key: its plainest scale. */
function defaultSource(shape: ChordShape): number[] {
  const id: ScaleId =
    shape.family === "minor"
      ? "dorian"
      : shape.family === "halfDiminished"
        ? "locrian"
        : shape.family === "dominant" || shape.family === "suspended"
          ? "mixolydian"
          : "ionian";
  return SCALES[id].map((i) => mod12(shape.root + i));
}

const fifthIsFlat = (shape: ChordShape) =>
  shape.triad === "diminished" || shape.fifth === "b5";

function fillScale(shape: ChordShape, source: number[]): number[] {
  const tones = new Set(shape.notes.tones.map((t) => mod12(t.semitones)));
  const inSource = (s: number) => source.includes(mod12(s));
  const pick = (candidates: number[], fallback: number) =>
    candidates.find((c) => tones.has(c)) ??
    candidates.find((c) => inSource(c)) ??
    fallback;

  const second = pick(shape.family === "dominant" ? [2, 1, 3] : [2, 1], 2);
  const third =
    shape.triad === "minor" || shape.triad === "diminished"
      ? 3
      : shape.triad === "major" || shape.triad === "augmented"
        ? 4
        : pick([4, 3], 4);
  // The fourth step: 11 or #11, but never the b5 the chord already has.
  const fourth = fifthIsFlat(shape) ? 5 : pick([5, 6], 5);
  const fifth =
    shape.triad === "diminished" || shape.fifth === "b5"
      ? 6
      : shape.triad === "augmented" || shape.fifth === "#5"
        ? 8
        : 7;
  const sixth = pick(fifth === 8 ? [9] : [9, 8], 9);
  const seventh =
    shape.seventh === "major"
      ? 11
      : shape.seventh === "minor"
        ? 10
        : shape.seventh === "diminished"
          ? 9
          : pick([11, 10], 11);
  // A sharp fourth and a flat fifth are the same note: keep one.
  const set = [
    0,
    second,
    third,
    fourth,
    fifth,
    sixth === seventh ? 9 : sixth,
    seventh,
  ];
  return [...new Set(set.map(mod12))];
}

function alternativesFor(shape: ChordShape, id: ScaleId | null): ScaleId[] {
  const list: ScaleId[] = [];
  switch (shape.family) {
    case "minor":
      if (shape.seventh === "major") list.push("melodicMinor", "harmonicMinor");
      else list.push("dorian", "aeolian", "phrygian");
      break;
    case "major":
      list.push("ionian", "lydian");
      break;
    case "dominant":
      list.push("mixolydian", "lydianDominant", "altered");
      break;
    case "halfDiminished":
      list.push("locrian", "locrianNat2");
      break;
    default:
      break;
  }
  return list.filter((s) => s !== id);
}

/** A tone that isn't in the chord, by its usual name as a tension. */
const TENSION_NAMES: Record<number, string> = {
  1: "b9",
  2: "9",
  3: "#9",
  4: "3",
  5: "11",
  6: "#11",
  7: "5",
  8: "b13",
  9: "13",
  10: "b7",
  11: "7",
};

/** Letters above the root a label spells ("b9" → 1, "#11" → 3). */
function letterSteps(label: string): number {
  const n = Number(label.replace(/[#b]/g, ""));
  return [0, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5][n] ?? 0;
}

function describeScale(
  shape: ChordShape,
  intervals: number[],
  id: ScaleId | null,
  alternatives: ScaleId[],
  flats: boolean,
): ChordScale {
  const sorted = [...new Set(intervals.map(mod12))].sort((a, b) => a - b);
  // The chord's own tones keep the names the chord gives them ("b5" in a
  // half-diminished chord, "6" in a sixth chord).
  const chordLabels = new Map<number, string>();
  shape.notes.tones.forEach((tone, i) => {
    const s = mod12(tone.semitones);
    if (!chordLabels.has(s)) chordLabels.set(s, shape.notes.intervalNames[i]);
  });
  const dominant = shape.family === "dominant";

  const tones: ScaleTone[] = sorted.map((s) => {
    const own = chordLabels.get(s);
    const label = own ?? (s === 0 ? "1" : TENSION_NAMES[s]);
    const spelled = spellInterval(shape.rootName, letterSteps(label), s, flats);
    const name =
      sorted.length === 7 && !/(##|bb)/.test(spelled)
        ? spelled
        : plainSpelling(spelled, flats);
    let role: ScaleTone["role"] = own !== undefined ? "chord" : "tension";
    if (role === "tension") {
      const below = mod12(s - 1);
      // A half step above a chord tone clashes with it, except the
      // altered tensions of a dominant, which are its colour.
      const avoid = dominant
        ? s === 5 && chordLabels.has(4)
        : chordLabels.has(below) && s !== 2;
      if (avoid) role = "avoid";
    }
    return { semitones: s, name, label, role };
  });

  return {
    id,
    root: shape.root,
    rootName: shape.rootName,
    tones,
    alternatives,
  };
}

// Harmonic fields

export type FieldId =
  | "major"
  | "naturalMinor"
  | "harmonicMinor"
  | "melodicMinor"
  | "secondaryDominants"
  | "relatedTwos"
  | "substitutes"
  | "borrowed"
  | "diminished";

export interface FieldChord {
  /** The degree, as `parseDegree` reads it. */
  degree: string;
  /** The chord in the key ("Dm7", "A7"). */
  symbol: string;
  fn: HarmonicFunction | null;
  scale: ScaleId | null;
}

const FIELDS: Record<
  FieldId,
  {
    tetrads: string[];
    triads: string[];
    minorTetrads?: string[];
    minorTriads?: string[];
  }
> = {
  major: {
    tetrads: ["I7M", "IIm7", "IIIm7", "IV7M", "V7", "VIm7", "VIIm7(b5)"],
    triads: ["I", "IIm", "IIIm", "IV", "V", "VIm", "VIIm(b5)"],
  },
  naturalMinor: {
    tetrads: ["Im7", "IIm7(b5)", "bIII7M", "IVm7", "Vm7", "bVI7M", "bVII7"],
    triads: ["Im", "IIm(b5)", "bIII", "IVm", "Vm", "bVI", "bVII"],
  },
  harmonicMinor: {
    tetrads: ["Im7M", "IIm7(b5)", "bIII7M(#5)", "IVm7", "V7", "bVI7M", "VII°"],
    triads: ["Im", "IIm(b5)", "bIII+", "IVm", "V", "bVI", "VIIm(b5)"],
  },
  melodicMinor: {
    tetrads: [
      "Im7M",
      "IIm7",
      "bIII7M(#5)",
      "IV7",
      "V7",
      "VIm7(b5)",
      "VIIm7(b5)",
    ],
    triads: ["Im", "IIm", "bIII+", "IV", "V", "VIm(b5)", "VIIm(b5)"],
  },
  secondaryDominants: {
    tetrads: ["V7/II", "V7/III", "V7/IV", "V7/V", "V7/VI"],
    triads: ["V/II", "V/III", "V/IV", "V/V", "V/VI"],
    minorTetrads: ["V7/IV", "V7/V", "V7/bIII", "V7/bVI", "V7/bVII"],
    minorTriads: ["V/IV", "V/V", "V/bIII", "V/bVI", "V/bVII"],
  },
  relatedTwos: {
    tetrads: [
      "IIm7(b5)/II",
      "IIm7(b5)/III",
      "IIm7/IV",
      "IIm7/V",
      "IIm7(b5)/VI",
    ],
    triads: ["IIm(b5)/II", "IIm(b5)/III", "IIm/IV", "IIm/V", "IIm(b5)/VI"],
    minorTetrads: [
      "IIm7(b5)/IV",
      "IIm7(b5)/V",
      "IIm7/bIII",
      "IIm7/bVI",
      "IIm7/bVII",
    ],
    minorTriads: ["IIm(b5)/IV", "IIm(b5)/V", "IIm/bIII", "IIm/bVI", "IIm/bVII"],
  },
  substitutes: {
    tetrads: [
      "SubV7",
      "SubV7/II",
      "SubV7/III",
      "SubV7/IV",
      "SubV7/V",
      "SubV7/VI",
    ],
    triads: ["SubV", "SubV/II", "SubV/III", "SubV/IV", "SubV/V", "SubV/VI"],
    minorTetrads: [
      "SubV7",
      "SubV7/IV",
      "SubV7/V",
      "SubV7/bIII",
      "SubV7/bVI",
      "SubV7/bVII",
    ],
    minorTriads: [
      "SubV",
      "SubV/IV",
      "SubV/V",
      "SubV/bIII",
      "SubV/bVI",
      "SubV/bVII",
    ],
  },
  borrowed: {
    tetrads: [
      "Im7",
      "IIm7(b5)",
      "bIII7M",
      "IVm7",
      "IVm6",
      "Vm7",
      "bVI7M",
      "bVII7",
      "bII7M",
    ],
    triads: ["Im", "IIm(b5)", "bIII", "IVm", "Vm", "bVI", "bVII", "bII"],
    minorTetrads: ["I7M", "IIm7", "IV7", "bII7M", "VIm7(b5)"],
    minorTriads: ["I", "IIm", "IV", "bII"],
  },
  diminished: {
    tetrads: ["#I°", "#II°", "bIII°", "#IV°", "#V°", "bVI°", "I°", "VII°"],
    triads: ["#I°", "#II°", "bIII°", "#IV°", "#V°", "bVI°", "I°", "VII°"],
  },
};

/** Which scale each field's chords are drawn from. */
const FIELD_SOURCE: Partial<Record<FieldId, (minor: boolean) => SourceKind>> = {
  major: () => "major",
  naturalMinor: () => "naturalMinor",
  harmonicMinor: () => "harmonicMinor",
  melodicMinor: () => "melodicMinor",
};

/** The fields a key offers, in the order they're taught. */
export function fieldsFor(minor: boolean): FieldId[] {
  return minor
    ? [
        "naturalMinor",
        "harmonicMinor",
        "melodicMinor",
        "secondaryDominants",
        "relatedTwos",
        "substitutes",
        "borrowed",
        "diminished",
      ]
    : [
        "major",
        "secondaryDominants",
        "relatedTwos",
        "substitutes",
        "borrowed",
        "diminished",
      ];
}

/**
 * One harmonic field in a key, each degree with its chord spelled in the
 * key ("V7/II" in C → "A7"), its function and its scale.
 */
export function harmonicField(
  key: string,
  field: FieldId,
  set: "tetrads" | "triads" = "tetrads",
): FieldChord[] {
  const parsed = parseKey(key);
  if (!parsed) return [];
  const spec = FIELDS[field];
  const list = parsed.isMinor
    ? set === "tetrads"
      ? (spec.minorTetrads ?? spec.tetrads)
      : (spec.minorTriads ?? spec.triads)
    : set === "tetrads"
      ? spec.tetrads
      : spec.triads;
  return list.flatMap((text) => {
    const degree = parseDegree(text);
    if (!degree) return [];
    const rootName = degreeRootName(degree, key);
    if (!rootName) return [];
    const symbol = `${rootName}${degree.quality}`;
    const concept = describeDegree(degree, parsed.isMinor);
    const shape = chordShape(symbol);
    const scale = shape
      ? chordScale(shape, degree, key, FIELD_SOURCE[field]?.(parsed.isMinor))
      : null;
    return [
      {
        degree: formatDegree(degree),
        symbol,
        fn: concept?.fn ?? null,
        scale: scale?.id ?? null,
      },
    ];
  });
}

/**
 * The chord a degree stands for in a key ("V7/II" in C → "A7"), or null
 * when the key or the degree can't say.
 */
export function chordForDegree(
  degree: Degree,
  key: string | null,
): string | null {
  if (!key || !degreeIsSet(degree)) return null;
  const rootName = degreeRootName(degree, key);
  return rootName ? `${rootName}${degree.quality}` : null;
}

/** "m7" → "minor", for comparing a degree to its chord. */
export function coarseFamily(
  family: ChordQuality,
): "major" | "minor" | "diminished" {
  if (family === "minor") return "minor";
  if (family === "diminished" || family === "halfDiminished")
    return "diminished";
  return "major";
}

export { qualityOf };
