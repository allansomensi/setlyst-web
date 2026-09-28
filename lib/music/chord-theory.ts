/**
 * What a chord symbol *contains*: its notes, spelled.
 *
 * `chords.ts` knows how to recognise and move a chord symbol; this module
 * reads its suffix and works out the chord tones, which is what the chord
 * diagrams (guitar, keyboard...) are drawn from. Pure and framework-free.
 *
 * Chord symbols are written in two traditions here, and both are read:
 *
 *  - International: `Cmaj7`, `C7b9`, `Cm7b5`, `Cdim7`, `Csus4`, `C9`.
 *  - Brazilian: `C7M`, `C7(9)`, `C7/9`, `Cm7(b5)`, `C°`,
 *    `C4`, `C7/4`, `C7+`, `C9-`, `C6/9`.
 *
 * Where the two disagree the Brazilian reading wins, since that's the
 * audience of the harmonic analysis this feeds: a bare `9` is an *added*
 * ninth (`C9` = C E G D, "C com nona"), `°` alone is the diminished
 * seventh chord (the Brazilian "acorde diminuto" is always a four-note chord),
 * and `7+` is the major seventh. A chord with a seventh *and* a ninth is
 * written with both (`C7(9)`, `C7M(9)`), which both traditions read alike.
 */

import { parseChord } from "./chords";

/** One chord tone: its distance from the root, and its role. */
export interface ChordTone {
  /** Semitones above the root, 0–23 (tensions sit an octave up). */
  semitones: number;
  /** The scale degree it spells: 1, 3, 5, 7, 9, 11, 13 (or 2, 4, 6). */
  degree: number;
  /**
   * Whether a voicing must include it. The root, the third (or what
   * replaces it), the seventh and every written tension are required;
   * an unaltered fifth is not — it is the first note players leave out.
   */
  required: boolean;
}

export interface ChordNotes {
  /** The symbol as written. */
  symbol: string;
  rootPitchClass: number;
  /** The root as written ("Bb", "F#"). */
  rootName: string;
  /** Slash-chord bass, or null. */
  bassPitchClass: number | null;
  bassName: string | null;
  tones: ChordTone[];
  /** Pitch classes of every tone (the bass included). */
  pitchClasses: number[];
  /** Tone names, root first, spelled from the root ("G B D F"). */
  noteNames: string[];
  /** Interval labels in the same order ("1 3 5 b7"). */
  intervalNames: string[];
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_PITCH = [0, 2, 4, 5, 7, 9, 11] as const;

/** Semitones of each natural interval from 1 to 13, by degree. */
const NATURAL_INTERVAL: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
  9: 14,
  11: 17,
  13: 21,
};

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Spells `degree` above a root letter, e.g. b7 above G → F. */
function spellAbove(
  rootLetterIndex: number,
  rootPitchClass: number,
  degree: number,
  semitones: number,
): string {
  const steps = (degree - 1) % 7;
  const letterIndex = (rootLetterIndex + steps) % 7;
  const letter = LETTERS[letterIndex];
  const target = mod12(rootPitchClass + semitones);
  let offset = mod12(target - LETTER_PITCH[letterIndex]);
  if (offset > 6) offset -= 12;
  if (Math.abs(offset) > 2) {
    // Beyond a double accidental: spell it plainly instead.
    return SHARP_NAMES[target];
  }
  const accidental =
    offset > 0 ? "#".repeat(offset) : offset < 0 ? "b".repeat(-offset) : "";
  return `${letter}${accidental}`;
}

const SHARP_NAMES = [
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

/** The interval label of a tone ("b3", "#11", "5"). */
function intervalName(degree: number, semitones: number): string {
  const natural = NATURAL_INTERVAL[degree] ?? 0;
  let diff = semitones - natural;
  // Diminished seventh: written "bb7", a sixth's worth of semitones.
  if (degree === 7 && diff === -2) return "bb7";
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  const accidental = diff > 0 ? "#".repeat(diff) : "b".repeat(-diff);
  return `${accidental}${degree}`;
}

interface QualityState {
  /** 4 major, 3 minor, 5 sus4, 2 sus2, null no third (power chord). */
  third: number | null;
  /** 7 perfect, 6 flat, 8 sharp, null omitted. */
  fifth: number | null;
  fifthAltered: boolean;
  /** 10 minor seventh, 11 major seventh, 9 diminished, null none. */
  seventh: number | null;
  /** Added tones: degree → semitones. */
  added: Map<number, number>;
}

function addTension(state: QualityState, degree: number, semitones: number) {
  state.added.set(degree * 100 + semitones, semitones);
}

/**
 * Reads a chord suffix ("m7(b5)", "7M(9)", "7/4", "sus4", "°") into the
 * chord's structure. Unknown characters are skipped: a symbol that
 * `parseChord` accepted is always read as *something* sensible.
 */
function readSuffix(suffix: string): QualityState {
  const state: QualityState = {
    third: 4,
    fifth: 7,
    fifthAltered: false,
    seventh: null,
    added: new Map(),
  };
  const s = suffix.replace(/\s+/g, "");
  let i = 0;
  let sawSeventh = false;
  let inParens = 0;

  const take = (pattern: RegExp): RegExpExecArray | null => {
    pattern.lastIndex = i;
    const match = pattern.exec(s);
    if (match && match.index === i) {
      i += match[0].length;
      return match;
    }
    return null;
  };

  const extendTo = (n: number) => {
    // "maj9", "m11", "13": the seventh plus every tension up to n.
    if (n >= 9) addTension(state, 9, 14);
    if (n >= 11 && state.third !== 4) addTension(state, 11, 17);
    if (n >= 13) addTension(state, 13, 21);
  };

  while (i < s.length) {
    const start = i;
    let match: RegExpExecArray | null;

    if (s[i] === "(") {
      inParens++;
      i++;
      continue;
    }
    if (s[i] === ")") {
      inParens = Math.max(0, inParens - 1);
      i++;
      continue;
    }
    if (s[i] === "," || s[i] === "/") {
      i++;
      continue;
    }

    // Major seventh: 7M, 7+, maj7, M7, Δ, Δ7, maj9...
    if ((match = take(/7M|7\+(?!\d)|7maj/y))) {
      state.seventh = 11;
      sawSeventh = true;
      continue;
    }
    if ((match = take(/(?:maj|Maj|MAJ|Ma|M|Δ)(7|9|11|13)?/y))) {
      state.seventh = 11;
      sawSeventh = true;
      if (match[1]) extendTo(Number(match[1]));
      continue;
    }

    // Half-diminished: ø, ø7.
    if (take(/ø7?/y)) {
      state.third = 3;
      state.fifth = 6;
      state.fifthAltered = true;
      state.seventh = 10;
      sawSeventh = true;
      continue;
    }

    // Diminished: °, º, dim, dim7, °7. The Brazilian "°" is the four-note
    // chord; "dim" alone is the triad.
    if ((match = take(/(°|º|dim|o(?=7|$))(7)?/y))) {
      state.third = 3;
      state.fifth = 6;
      state.fifthAltered = true;
      if (match[2] || match[1] !== "dim") {
        state.seventh = 9;
        sawSeventh = true;
      }
      continue;
    }

    // Augmented: aug, + (as a quality, not "5+"/"9+").
    if (take(/aug/y) || (start === 0 && take(/\+/y))) {
      state.fifth = 8;
      state.fifthAltered = true;
      continue;
    }

    // Minor: m, min, mi, and "-" right after the root ("C-7").
    if (take(/min|mi(?!n)|m(?!aj)/y) || (start === 0 && take(/-(?=\d|$)/y))) {
      state.third = 3;
      continue;
    }

    if ((match = take(/sus(2|4)?/y))) {
      state.third = match[1] === "2" ? 2 : 5;
      continue;
    }

    if ((match = take(/add([#b+-]?)(\d{1,2})/y))) {
      const degree = Number(match[2]);
      const semis = alteredSemitones(degree, match[1]);
      if (semis !== null) addTension(state, degree, semis);
      continue;
    }

    if ((match = take(/(?:no|omit)(3|5)/y))) {
      if (match[1] === "3") state.third = null;
      else state.fifth = null;
      continue;
    }

    // A number, possibly altered before ("b9", "#11") or after ("9-",
    // "11+", "5+").
    if ((match = take(/([#b+-]?)(\d{1,2})([+-]?)/y))) {
      const pre = match[1];
      const post = match[3];
      const alteration = pre || post;
      const n = Number(match[2]);
      applyNumber(state, n, alteration, {
        sawSeventh,
        inParens: inParens > 0,
        first: start === 0,
        followsSlash: start > 0 && s[start - 1] === "/",
      });
      if (n === 7) sawSeventh = true;
      continue;
    }

    // Anything else ("alt" and friends): skip a character.
    if (take(/alt/y)) {
      // Altered dominant: b9, #9, b13 over a seventh chord.
      state.seventh = 10;
      addTension(state, 9, 13);
      addTension(state, 9, 15);
      addTension(state, 13, 20);
      continue;
    }
    i++;
  }

  return state;
}

function alteredSemitones(degree: number, alteration: string): number | null {
  const natural = NATURAL_INTERVAL[degree];
  if (natural === undefined) return null;
  if (alteration === "b" || alteration === "-") return natural - 1;
  if (alteration === "#" || alteration === "+") return natural + 1;
  return natural;
}

function applyNumber(
  state: QualityState,
  n: number,
  alteration: string,
  context: {
    sawSeventh: boolean;
    inParens: boolean;
    first: boolean;
    followsSlash: boolean;
  },
) {
  const flat = alteration === "b" || alteration === "-";
  const sharp = alteration === "#" || alteration === "+";

  switch (n) {
    case 5:
      if (flat) {
        state.fifth = 6;
        state.fifthAltered = true;
      } else if (sharp) {
        state.fifth = 8;
        state.fifthAltered = true;
      } else if (context.first) {
        // "C5": the power chord, root and fifth.
        state.third = null;
      }
      return;
    case 2:
      if (context.inParens || context.followsSlash) addTension(state, 9, 14);
      else state.third = 2;
      return;
    case 4:
      // "C4", "C7/4", "C4/7", "C7(4)": the suspended fourth, Brazilian
      // style. An eleventh written as 4 is the same note.
      state.third = 5;
      return;
    case 6:
      if (flat) addTension(state, 13, 20);
      else addTension(state, 6, 9);
      return;
    case 7:
      if (state.seventh === null || state.seventh === 10) {
        state.seventh = flat ? 9 : 10;
      }
      return;
    case 9: {
      const semis = flat ? 13 : sharp ? 15 : 14;
      // A bare 9 with no seventh before it is an added ninth ("C9", "Am9"
      // = "C com nona"); written as a tension of a seventh chord, it is
      // just the tension.
      addTension(state, 9, semis);
      return;
    }
    case 11: {
      const semis = sharp ? 18 : flat ? 16 : 17;
      if (!context.sawSeventh && !context.inParens && !context.followsSlash) {
        // "Am11", "C11": the eleventh chord, seventh included.
        state.seventh = state.seventh ?? 10;
      }
      addTension(state, 11, semis);
      return;
    }
    case 13: {
      const semis = flat ? 20 : sharp ? 22 : 21;
      if (!context.sawSeventh && !context.inParens && !context.followsSlash) {
        // "G13": a dominant thirteenth.
        state.seventh = state.seventh ?? 10;
      }
      addTension(state, 13, semis);
      return;
    }
    default:
      return;
  }
}

/**
 * The notes of a chord symbol, or null when it isn't one ("N.C.",
 * section names). Parenthesised passing chords ("(G7)") are read as the
 * chord inside.
 */
export function chordNotes(symbol: string): ChordNotes | null {
  const cleaned = symbol.trim().replace(/^\((.+)\)$/, "$1");
  const parsed = parseChord(cleaned);
  if (!parsed) return null;

  const rootMatch = /^([A-G])([#b]{0,2})/.exec(cleaned);
  if (!rootMatch) return null;
  const rootName = rootMatch[0];
  const rootLetterIndex = LETTERS.indexOf(
    rootMatch[1] as (typeof LETTERS)[number],
  );

  const bassMatch = /\/([A-G][#b]{0,2})$/.exec(cleaned);
  const bassName =
    parsed.bassPitchClass !== null ? (bassMatch?.[1] ?? null) : null;

  const state = readSuffix(parsed.suffix);
  const tones: ChordTone[] = [{ semitones: 0, degree: 1, required: true }];

  if (state.third !== null) {
    const degree = state.third === 5 ? 4 : state.third === 2 ? 2 : 3;
    tones.push({ semitones: state.third, degree, required: true });
  }
  if (state.fifth !== null) {
    tones.push({
      semitones: state.fifth,
      degree: 5,
      // A power chord's fifth is all there is besides the root.
      required: state.fifthAltered || state.third === null,
    });
  }
  if (state.seventh !== null) {
    tones.push({ semitones: state.seventh, degree: 7, required: true });
  }
  const tensions = [...state.added.entries()]
    .map(([key, semitones]) => ({ degree: Math.floor(key / 100), semitones }))
    .sort((a, b) => a.semitones - b.semitones);
  for (const tension of tensions) {
    // A sixth in a chord with a seventh is a thirteenth.
    const degree =
      tension.degree === 6 && state.seventh !== null ? 13 : tension.degree;
    // Keep one tone per pitch class (e.g. "4" and "11" together).
    if (
      tones.some((tone) => mod12(tone.semitones) === mod12(tension.semitones))
    ) {
      continue;
    }
    tones.push({ semitones: tension.semitones, degree, required: true });
  }

  const pitchClasses = [
    ...new Set(
      tones
        .map((tone) => mod12(parsed.rootPitchClass + tone.semitones))
        .concat(parsed.bassPitchClass !== null ? [parsed.bassPitchClass] : []),
    ),
  ];

  return {
    symbol: cleaned,
    rootPitchClass: parsed.rootPitchClass,
    rootName,
    bassPitchClass: parsed.bassPitchClass,
    bassName,
    tones,
    pitchClasses,
    noteNames: tones.map((tone) =>
      spellAbove(
        rootLetterIndex,
        parsed.rootPitchClass,
        tone.degree,
        tone.semitones,
      ),
    ),
    intervalNames: tones.map((tone) =>
      intervalName(tone.degree, tone.semitones),
    ),
  };
}

/** The spelled name of a pitch class inside a chord, or a plain name. */
export function noteNameIn(chord: ChordNotes, pitchClass: number): string {
  const index = chord.tones.findIndex(
    (tone) => mod12(chord.rootPitchClass + tone.semitones) === pitchClass,
  );
  if (index >= 0) return chord.noteNames[index];
  if (chord.bassPitchClass === pitchClass && chord.bassName) {
    return chord.bassName;
  }
  return SHARP_NAMES[mod12(pitchClass)];
}
