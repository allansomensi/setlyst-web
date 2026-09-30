/**
 * What a written degree *means*: the name harmony books give it ("II
 * relativo do V7/IV", "dominante secundária do VI", "empréstimo modal")
 * and the cadences a run of degrees forms (II–V secundário, dominantes
 * estendidos, cadência de engano).
 *
 * The analysis itself stays the musician's (lib/music/analysis.ts guesses
 * nothing): this only *reads* the degrees already written and names them,
 * so the inspector and the overview can say what a chord is doing. Every
 * degree is placed by its root in semitones above the tonic, so the same
 * passage is recognised however it was spelled (IIIm7 → VI7 and
 * IIm7/II → V7/II are both a II–V to the II).
 *
 * Pure and framework-free; the texts live in the `analysis.concepts`
 * messages, keyed by the ids below.
 */

import {
  degreeIsSet,
  type Degree,
  type HarmonicAnalysis,
  type HarmonicFunction,
} from "./analysis";

// Reading a degree

const NUMERAL_SEMITONES: Record<string, number> = {
  I: 0,
  II: 2,
  III: 4,
  IV: 5,
  V: 7,
  VI: 9,
  VII: 11,
};

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** "bVI" → 8, "IIm" → 2, "#IV" → 6; null when it isn't a numeral. */
export function numeralSemitones(text: string): number | null {
  const match = /^([b#♭♯]?)(VII|VI|V|IV|III|II|I)/i.exec(text.trim());
  if (!match) return null;
  const base = NUMERAL_SEMITONES[match[2].toUpperCase()];
  const shift =
    match[1] === "b" || match[1] === "♭"
      ? -1
      : match[1] === "#" || match[1] === "♯"
        ? 1
        : 0;
  return mod12(base + shift);
}

/** The numeral of a scale step, the way it's usually spelled in a key. */
const STEP_NAMES = [
  "I",
  "bII",
  "II",
  "bIII",
  "III",
  "IV",
  "#IV",
  "V",
  "bVI",
  "VI",
  "bVII",
  "VII",
] as const;

export function stepName(semitones: number): string {
  return STEP_NAMES[mod12(semitones)];
}

export type ChordQuality =
  | "major"
  | "minor"
  | "dominant"
  | "halfDiminished"
  | "diminished"
  | "augmented"
  | "suspended";

/**
 * The family of a degree's quality as written ("7M", "m7", "7(b9)",
 * "m7(b5)", "°", "+"). A bare numeral is a major triad.
 */
export function qualityOf(quality: string): ChordQuality {
  const q = quality.replace(/\s+/g, "");
  if (/^(°|º|dim|o(?=7|$))/.test(q)) return "diminished";
  if (
    /^ø/.test(q) ||
    /^m(?:in|i)?7?\(?(?:b|-)5/.test(q) ||
    /^m7?\(?5-/.test(q)
  ) {
    return "halfDiminished";
  }
  if (/^(m|min|mi|-)(?!aj)/.test(q)) return "minor";
  if (/^(\+|aug)/.test(q)) return "augmented";
  if (/^(7M|7\+|maj|Maj|M|Δ)/.test(q)) return "major";
  // "7", "7(b9)", "9", "13", "7sus4", "7/4": dominant sevenths (a
  // suspended one still works as a dominant).
  if (/^(7|9|11|13|alt)/.test(q)) return "dominant";
  if (/^(sus|4)/.test(q)) return "suspended";
  return "major";
}

/** Whether a quality is written as a four-note chord (or wider). */
export function isTetrad(quality: string): boolean {
  return /7|6|9|11|13|°|º|ø/.test(quality);
}

/**
 * Where a degree's root sits, in semitones above the tonic of the key in
 * force: "V7/IV" → 0 (the V of IV is the I), "SubV7/II" → 3, "bVII7" → 10.
 */
export function rootOf(degree: Degree): number | null {
  if (!degreeIsSet(degree)) return null;
  const own = numeralSemitones(`${degree.accidental}${degree.numeral}`);
  if (own === null) return null;
  const target = degree.target ? numeralSemitones(degree.target) : 0;
  if (target === null) return null;
  // A substitute dominant sits a half step above where it resolves.
  if (degree.sub) return mod12(target + 1);
  return mod12(target + own);
}

/**
 * Where a dominant goes: its target ("V7/II" → the II), or the tonic.
 * For any other chord, null.
 */
export function resolutionOf(degree: Degree): number | null {
  if (!isDominant(degree)) return null;
  const root = rootOf(degree);
  if (root === null) return null;
  // A SubV resolves a half step down, any other dominant a fifth down.
  return mod12(root - (degree.sub ? 1 : 7));
}

/**
 * A chord with a dominant's job: a V (or SubV) with a dominant sound
 * ("V7", "V", "V7(b9)/II", "SubV7"), or a dominant seventh written on any
 * other degree ("VI7" is the V7/II spelled plainly).
 */
export function isDominant(degree: Degree | null): degree is Degree {
  if (!degreeIsSet(degree)) return false;
  const quality = qualityOf(degree.quality);
  if (degree.sub) return quality === "dominant" || quality === "major";
  if (!degree.accidental && degree.numeral === "V") {
    return (
      quality === "dominant" || quality === "major" || quality === "suspended"
    );
  }
  return quality === "dominant";
}

/** A II fit to prepare a V: minor or half-diminished. */
function isTwoLike(degree: Degree | null): degree is Degree {
  if (!degreeIsSet(degree)) return false;
  const quality = qualityOf(degree.quality);
  return quality === "minor" || quality === "halfDiminished";
}

// Naming one chord

export type ConceptId =
  | "tonic"
  | "tonicRelative"
  | "tonicAntiRelative"
  | "relativeMajor"
  | "subdominant"
  | "subdominantRelative"
  | "subdominantMinor"
  | "dominant"
  | "dominantMinorKey"
  | "dominantNoRoot"
  | "minorFive"
  | "subtonic"
  | "secondaryDominant"
  | "substituteDominant"
  | "secondarySubstitute"
  | "relatedTwo"
  | "secondaryLeadingTone"
  | "diminishedAscending"
  | "diminishedDescending"
  | "diminishedAuxiliary"
  | "diminished"
  | "neapolitan"
  | "modalBorrowing"
  | "augmented"
  | "chromatic";

export interface Concept {
  id: ConceptId;
  /** The chord it points to, as a numeral ("IV", "IIm", "bVI"). */
  target?: string;
  /** The function the name implies, when it implies one. */
  fn?: HarmonicFunction;
}

/**
 * A degree's name in harmony-book terms, read in a major or a minor key
 * (minor keys written with the major scale's numerals: bIII, bVI, bVII).
 */
export function describeDegree(
  degree: Degree | null,
  minorKey: boolean,
): Concept | null {
  if (!degreeIsSet(degree)) return null;
  const quality = qualityOf(degree.quality);
  const numeral = `${degree.accidental}${degree.numeral}`;
  const step = numeralSemitones(numeral);
  if (step === null) return null;

  if (degree.target) {
    const target = degree.target;
    if (degree.sub) {
      return { id: "secondarySubstitute", target, fn: "D" };
    }
    if (isDominant(degree)) {
      return { id: "secondaryDominant", target, fn: "D" };
    }
    if (
      step === 11 &&
      (quality === "diminished" || quality === "halfDiminished")
    ) {
      return { id: "secondaryLeadingTone", target, fn: "D" };
    }
    if (step === 2 && isTwoLike(degree)) {
      return { id: "relatedTwo", target, fn: "SD" };
    }
    return { id: "chromatic", target };
  }

  if (degree.sub) return { id: "substituteDominant", fn: "D" };

  if (quality === "diminished") {
    if (step === 11) {
      return minorKey
        ? { id: "dominantNoRoot", fn: "D" }
        : { id: "diminishedAscending", target: "I", fn: "D" };
    }
    if (degree.accidental === "#") {
      return {
        id: "diminishedAscending",
        target: stepName(step + 1),
        fn: "D",
      };
    }
    if (degree.accidental === "b") {
      return { id: "diminishedDescending", target: stepName(step - 1) };
    }
    if (step === 0) return { id: "diminishedAuxiliary", target: "I" };
    return { id: "diminished" };
  }

  if (quality === "augmented") return { id: "augmented" };

  // A dominant seventh away from the V: a secondary dominant written
  // plainly ("VI7" = V7/II), a SubV written as a bII7, or the bVII7.
  if (quality === "dominant" && step !== 7) {
    if (step === 1) return { id: "substituteDominant", fn: "D" };
    if (step === 10) {
      return minorKey
        ? { id: "subtonic", target: "bIII", fn: "SD" }
        : { id: "modalBorrowing", fn: "SD" };
    }
    return { id: "secondaryDominant", target: stepName(step + 5), fn: "D" };
  }

  if (minorKey) {
    switch (step) {
      case 0:
        return quality === "minor"
          ? { id: "tonic", fn: "T" }
          : { id: "chromatic" };
      case 2:
        return quality === "halfDiminished" || quality === "minor"
          ? { id: "subdominantRelative", fn: "SD" }
          : { id: "chromatic" };
      case 3:
        return quality === "major"
          ? { id: "relativeMajor", fn: "T" }
          : { id: "chromatic" };
      case 5:
        return quality === "minor"
          ? { id: "subdominant", fn: "SD" }
          : quality === "dominant"
            ? { id: "modalBorrowing", fn: "SD" }
            : { id: "chromatic" };
      case 7:
        if (isDominant(degree)) return { id: "dominantMinorKey", fn: "D" };
        return quality === "minor"
          ? { id: "minorFive", fn: "D" }
          : { id: "chromatic" };
      case 8:
        return quality === "major"
          ? { id: "subdominantRelative", fn: "SD" }
          : { id: "chromatic" };
      case 10:
        return quality === "major" || quality === "dominant"
          ? { id: "subtonic", target: "bIII", fn: "SD" }
          : { id: "chromatic" };
      case 1:
        return quality === "major"
          ? { id: "neapolitan", fn: "SD" }
          : { id: "chromatic" };
      default:
        return { id: "chromatic" };
    }
  }

  switch (step) {
    case 0:
      if (quality === "major") return { id: "tonic", fn: "T" };
      if (quality === "minor") return { id: "modalBorrowing", fn: "T" };
      return { id: "chromatic" };
    case 2:
      if (quality === "minor") return { id: "subdominantRelative", fn: "SD" };
      if (quality === "halfDiminished") {
        return { id: "modalBorrowing", fn: "SD" };
      }
      return { id: "chromatic" };
    case 4:
      return quality === "minor"
        ? { id: "tonicAntiRelative", fn: "T" }
        : { id: "chromatic" };
    case 5:
      if (quality === "major") return { id: "subdominant", fn: "SD" };
      if (quality === "minor") return { id: "subdominantMinor", fn: "SD" };
      return { id: "chromatic" };
    case 7:
      if (isDominant(degree)) return { id: "dominant", fn: "D" };
      if (quality === "minor") return { id: "modalBorrowing", fn: "D" };
      return { id: "chromatic" };
    case 9:
      return quality === "minor"
        ? { id: "tonicRelative", fn: "T" }
        : { id: "chromatic" };
    case 11:
      return quality === "halfDiminished"
        ? { id: "dominantNoRoot", fn: "D" }
        : { id: "chromatic" };
    case 1:
      return quality === "major"
        ? { id: "neapolitan", fn: "SD" }
        : { id: "chromatic" };
    case 3:
    case 8:
    case 10:
      return quality === "major" || quality === "dominant"
        ? { id: "modalBorrowing", fn: step === 3 ? "T" : "SD" }
        : { id: "chromatic" };
    default:
      return { id: "chromatic" };
  }
}

// Naming a passage

export type PatternId =
  | "twoFive"
  | "twoFiveSecondary"
  | "twoSubV"
  | "extendedDominants"
  | "perfectCadence"
  | "deceptiveCadence"
  | "plagalCadence"
  | "backdoorCadence";

export interface Pattern {
  id: PatternId;
  /** The chords it spans, in order (chord indexes). */
  chords: number[];
  /** Where it heads, as a numeral ("IV", "IIm"), for the secondary ones. */
  target?: string;
  /** Whether the chord it heads for actually follows (a II–V–I). */
  resolved?: boolean;
}

/** The analysed chords in song order, with their degrees. */
function analysedChords(
  analysis: HarmonicAnalysis,
  chordCount: number,
): { index: number; degree: Degree }[] {
  const list: { index: number; degree: Degree }[] = [];
  for (let i = 0; i < chordCount; i++) {
    const degree = analysis.entries[String(i)]?.degree ?? null;
    if (degreeIsSet(degree)) list.push({ index: i, degree });
  }
  return list;
}

/** A target as written, or the step it falls on. */
function targetName(degree: Degree, resolution: number): string {
  return degree.target || stepName(resolution);
}

/**
 * The cadences and progressions a run of degrees forms, in song order.
 * Neighbours are the analysed chords next to each other (a chord left
 * without a degree doesn't break a run: it's simply not read), and a
 * change of key between two chords does.
 */
export function findPatterns(
  analysis: HarmonicAnalysis,
  chordCount: number,
): Pattern[] {
  const chords = analysedChords(analysis, chordCount);
  const patterns: Pattern[] = [];
  const keyStarts = new Set(analysis.keys.map((k) => k.at));
  // A key change between a and b, b included.
  const keyChangeBetween = (a: number, b: number) => {
    for (let i = a + 1; i <= b; i++) if (keyStarts.has(i)) return true;
    return false;
  };

  const next = (i: number) => {
    const current = chords[i];
    const following = chords[i + 1];
    if (!current || !following) return null;
    return keyChangeBetween(current.index, following.index) ? null : following;
  };

  // II–V (and II–SubV), primary and secondary.
  for (let i = 0; i < chords.length; i++) {
    const two = chords[i];
    const five = next(i);
    if (!five || !isTwoLike(two.degree) || !isDominant(five.degree)) continue;
    const resolution = resolutionOf(five.degree);
    const twoRoot = rootOf(two.degree);
    if (resolution === null || twoRoot === null) continue;
    if (twoRoot !== mod12(resolution + 2)) continue;
    const after = next(i + 1);
    const resolved = !!after && rootOf(after.degree) === resolution;
    const secondary = resolution !== 0;
    patterns.push({
      id: five.degree.sub
        ? "twoSubV"
        : secondary
          ? "twoFiveSecondary"
          : "twoFive",
      chords: resolved
        ? [two.index, five.index, after.index]
        : [two.index, five.index],
      ...(secondary || five.degree.sub
        ? { target: targetName(five.degree, resolution) }
        : {}),
      resolved,
    });
  }

  // Extended dominants: two or more dominants, each resolving on the next.
  let run: number[] = [];
  const flush = () => {
    if (run.length >= 2) {
      patterns.push({ id: "extendedDominants", chords: run });
    }
    run = [];
  };
  for (let i = 0; i < chords.length; i++) {
    const current = chords[i];
    if (!isDominant(current.degree)) {
      flush();
      continue;
    }
    if (run.length === 0) run.push(current.index);
    const following = next(i);
    if (
      following &&
      isDominant(following.degree) &&
      rootOf(following.degree) === resolutionOf(current.degree)
    ) {
      run.push(following.index);
    } else {
      flush();
    }
  }
  flush();

  // Cadences on the tonic (and the deceptive one, onto the VI).
  for (let i = 0; i < chords.length; i++) {
    const a = chords[i];
    const b = next(i);
    if (!b) continue;
    const aRoot = rootOf(a.degree);
    const bRoot = rootOf(b.degree);
    if (aRoot === null || bRoot === null) continue;
    const aQuality = qualityOf(a.degree.quality);
    const bOnTonic = bRoot === 0 && !b.degree.target;
    const aPlain = !a.degree.target && !a.degree.sub;

    const aFive = aPlain && aRoot === 7 && isDominant(a.degree);

    if (aFive && bOnTonic) {
      patterns.push({ id: "perfectCadence", chords: [a.index, b.index] });
    } else if (aFive && !b.degree.target && (bRoot === 9 || bRoot === 8)) {
      patterns.push({ id: "deceptiveCadence", chords: [a.index, b.index] });
    } else if (aPlain && aRoot === 5 && bOnTonic) {
      patterns.push({ id: "plagalCadence", chords: [a.index, b.index] });
    } else if (
      aPlain &&
      aRoot === 10 &&
      (aQuality === "dominant" || aQuality === "major") &&
      bOnTonic
    ) {
      patterns.push({ id: "backdoorCadence", chords: [a.index, b.index] });
    }
  }

  // A V → I already named as the end of a II–V–I isn't listed twice.
  const inTwoFiveOne = (p: Pattern) =>
    p.id === "perfectCadence" &&
    patterns.some(
      (other) =>
        other.id === "twoFive" &&
        other.resolved &&
        p.chords.every((chord) => other.chords.includes(chord)),
    );
  return patterns
    .filter((p) => !inTwoFiveOne(p))
    .sort(
      (a, b) => a.chords[0] - b.chords[0] || b.chords.length - a.chords.length,
    );
}

/**
 * The role a chord plays in the passages around it — the name a harmony
 * book gives it there ("II relativo do V7/IV"), which a degree read alone
 * can't tell: a Gm7 in C written "Vm7" is still the II of the II–V to F.
 */
export function roleInPatterns(
  patterns: readonly Pattern[],
  index: number,
): Concept | null {
  for (const pattern of patterns) {
    if (pattern.chords[0] !== index) continue;
    if (pattern.id === "twoFiveSecondary" || pattern.id === "twoSubV") {
      return { id: "relatedTwo", target: pattern.target, fn: "SD" };
    }
  }
  return null;
}
