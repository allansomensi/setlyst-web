/**
 * Chord voicings: where to put the fingers.
 *
 * Fretted instruments are *searched*, not looked up: every playable
 * combination of frets within a hand's reach is tried, the ones that
 * contain the chord are kept, and they are ranked the way a player would
 * rank them — open and low positions first, fewer fingers, no awkward
 * muted strings in the middle, the root (or the written bass) at the
 * bottom. That works for any chord symbol the app can read and for any
 * tuning, so the violão/guitarra, the ukulele and the cavaquinho all come
 * from the same code, and the common shapes (C = x32010, F = 133211,
 * Bm = x24432) come out on top because they *are* the easiest.
 *
 * The keyboard needs no search: a close voicing of the chord tones in the
 * right hand, over the bass in the left, and its inversions.
 */

import type { ChordNotes } from "./chord-theory";

export const STRING_INSTRUMENTS = ["guitar", "ukulele", "cavaquinho"] as const;
export type StringInstrument = (typeof STRING_INSTRUMENTS)[number];

export interface Tuning {
  /** MIDI notes of the open strings, lowest string first. */
  strings: readonly number[];
  /** Their names, same order. */
  names: readonly string[];
  /**
   * Whether the lowest *string* is also the lowest *pitch*. Re-entrant
   * tunings (the ukulele's high G) break that, and for them the root in
   * the bass is only a preference.
   */
  linear: boolean;
}

export const TUNINGS: Record<StringInstrument, Tuning> = {
  // E A D G B E
  guitar: {
    strings: [40, 45, 50, 55, 59, 64],
    names: ["E", "A", "D", "G", "B", "E"],
    linear: true,
  },
  // G C E A, re-entrant (the G is above the C).
  ukulele: {
    strings: [67, 60, 64, 69],
    names: ["G", "C", "E", "A"],
    linear: false,
  },
  // D G B D, the Brazilian standard tuning.
  cavaquinho: {
    strings: [62, 67, 71, 74],
    names: ["D", "G", "B", "D"],
    linear: true,
  },
};

export interface Barre {
  fret: number;
  /** String indexes (lowest string = 0), inclusive. */
  from: number;
  to: number;
}

export interface FrettedVoicing {
  /** Per string, lowest first: the fret, 0 for open, null for muted. */
  frets: (number | null)[];
  barre: Barre | null;
  /** Lower is easier; only meaningful for ordering. */
  score: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** How far one hand reaches, in frets (inclusive of both ends: 4 frets). */
const REACH = 3;
/** Highest position searched. */
const MAX_POSITION = 12;

/**
 * The pitch classes a voicing on `stringCount` strings must contain. When
 * a chord has more required notes than there are strings (a 13th on a
 * ukulele), the least essential go first: the root (the bass player has
 * it), then the ninth, the eleventh — never the third or the seventh,
 * which are what make the chord what it is.
 */
function requiredPitchClasses(
  chord: ChordNotes,
  stringCount: number,
): number[] {
  const tones = chord.tones.filter((tone) => tone.required);
  const byRole = tones.map((tone) => ({
    pc: mod12(chord.rootPitchClass + tone.semitones),
    // Drop order: higher first.
    drop:
      tone.degree === 1
        ? 3
        : tone.degree === 9 || tone.degree === 2
          ? 2
          : tone.degree === 11
            ? 1
            : 0,
  }));
  const required = [...new Map(byRole.map((t) => [t.pc, t])).values()];
  if (
    chord.bassPitchClass !== null &&
    !required.some((t) => t.pc === chord.bassPitchClass)
  ) {
    required.push({ pc: chord.bassPitchClass, drop: -1 });
  }
  const sorted = [...required].sort((a, b) => b.drop - a.drop);
  while (sorted.length > stringCount && sorted[0].drop > 0) sorted.shift();
  return sorted.map((t) => t.pc);
}

function fingersFor(frets: (number | null)[]): {
  count: number;
  barre: Barre | null;
} {
  const fretted = frets
    .map((fret, index) => ({ fret, index }))
    .filter(
      (f): f is { fret: number; index: number } =>
        f.fret !== null && f.fret > 0,
    );
  if (fretted.length === 0) return { count: 0, barre: null };

  const plain = fretted.length;
  const lowest = Math.min(...fretted.map((f) => f.fret));
  const atLowest = fretted.filter((f) => f.fret === lowest);
  if (atLowest.length < 2) return { count: plain, barre: null };

  // A barre runs from the lowest string at that fret to the highest, and
  // every string it crosses must be pressed at or above it.
  const from = atLowest[0].index;
  const to = atLowest[atLowest.length - 1].index;
  for (let s = from; s <= to; s++) {
    const fret = frets[s];
    if (fret === null || fret < lowest) return { count: plain, barre: null };
  }
  const withBarre = 1 + fretted.filter((f) => f.fret > lowest).length;
  if (withBarre < plain) {
    return { count: withBarre, barre: { fret: lowest, from, to } };
  }
  return { count: plain, barre: null };
}

function scoreVoicing(
  frets: (number | null)[],
  chord: ChordNotes,
  tuning: Tuning,
  required: readonly number[],
): FrettedVoicing | null {
  const n = frets.length;
  const sounding: number[] = [];
  const pitches: number[] = [];
  frets.forEach((fret, s) => {
    if (fret === null) return;
    sounding.push(s);
    pitches.push(tuning.strings[s] + fret);
  });

  // A power chord (root and fifth) is played on two or three strings.
  const power = chord.tones.every(
    (tone) => tone.degree === 1 || tone.degree === 5,
  );
  const minSounding = power ? 2 : n >= 6 ? 4 : n - 1;
  if (sounding.length < minSounding) return null;

  const present = new Set(pitches.map(mod12));
  for (const pc of required) if (!present.has(pc)) return null;

  const { count: fingers, barre } = fingersFor(frets);
  if (fingers > 4) return null;

  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const position = fretted.length ? Math.min(...fretted) : 0;
  const top = fretted.length ? Math.max(...fretted) : 0;
  if (top - position > REACH) return null;

  // The bass.
  const wantedBass = chord.bassPitchClass ?? chord.rootPitchClass;
  const lowestPitch = Math.min(...pitches);
  const bassOk = mod12(lowestPitch) === wantedBass;
  let score = 0;
  if (tuning.linear && n >= 6) {
    if (!bassOk) return null;
  } else if (tuning.linear) {
    score += bassOk ? 0 : 0.6;
  } else {
    score += bassOk ? -0.3 : 0;
  }

  // Muted strings: fine below the bass, awkward in the middle, and the
  // top string is almost always played.
  const firstSounding = sounding[0];
  const lastSounding = sounding[sounding.length - 1];
  let lowMutes = 0;
  let interiorMutes = 0;
  frets.forEach((fret, s) => {
    if (fret !== null) return;
    if (s < firstSounding) lowMutes++;
    else if (s > lastSounding) score += power ? 0.3 : n >= 6 ? 2.2 : 4;
    else interiorMutes++;
  });
  score += lowMutes * (n >= 6 ? 1.2 : 4) + interiorMutes * 6;

  // Open strings far up the neck are hard to reach around.
  const opens = frets.filter((f) => f === 0).length;
  if (opens > 0 && position > 4) score += 1.5 * opens;

  score += position * 0.7;
  score += fingers * 0.4;
  if (fingers === 4 && !barre) score += 0.8;
  if (barre) {
    score += 0.8;
    // A barre over every sounding string from the bass up is the
    // standard movable shape (the "F" and "Bm" shapes).
    if (barre.from === firstSounding && barre.to === lastSounding) score -= 1.5;
  }
  if (top - position === REACH) score += 1.5;

  // A missing perfect fifth thins a triad out.
  const fifth = chord.tones.find((tone) => tone.degree === 5);
  if (fifth && !present.has(mod12(chord.rootPitchClass + fifth.semitones))) {
    score += 0.8;
  }

  return { frets: [...frets], barre, score };
}

/**
 * Playable voicings of `chord` on a fretted instrument, easiest first.
 * Empty when nothing within reach contains it.
 */
export function frettedVoicings(
  chord: ChordNotes,
  instrument: StringInstrument,
  limit = 8,
): FrettedVoicing[] {
  const tuning = TUNINGS[instrument];
  const n = tuning.strings.length;
  const chordPcs = new Set(chord.pitchClasses);
  const required = requiredPitchClasses(chord, n);
  const found = new Map<string, FrettedVoicing>();

  for (let start = 1; start <= MAX_POSITION; start++) {
    const end = start + REACH;
    const options: (number | null)[][] = tuning.strings.map((open) => {
      const choices: (number | null)[] = [null];
      if (chordPcs.has(mod12(open))) choices.push(0);
      for (let fret = start; fret <= end; fret++) {
        if (chordPcs.has(mod12(open + fret))) choices.push(fret);
      }
      return choices;
    });

    const frets: (number | null)[] = new Array(n).fill(null);
    const walk = (s: number) => {
      if (s === n) {
        const voicing = scoreVoicing(frets, chord, tuning, required);
        if (!voicing) return;
        const key = frets.map((f) => (f === null ? "x" : f)).join(",");
        const existing = found.get(key);
        if (!existing || existing.score > voicing.score)
          found.set(key, voicing);
        return;
      }
      for (const choice of options[s]) {
        frets[s] = choice;
        walk(s + 1);
      }
    };
    walk(0);
  }

  return [...found.values()]
    .sort((a, b) => a.score - b.score || fretKey(a).localeCompare(fretKey(b)))
    .slice(0, limit);
}

function fretKey(voicing: FrettedVoicing): string {
  return voicing.frets
    .map((f) => (f === null ? "x" : String(f).padStart(2, "0")))
    .join("");
}

/** "x32010" / "x-10-12-..." — for tests and accessible labels. */
export function formatFrets(frets: readonly (number | null)[]): string {
  const wide = frets.some((f) => f !== null && f > 9);
  return frets.map((f) => (f === null ? "x" : String(f))).join(wide ? "-" : "");
}

// Keyboard

export interface KeyboardVoicing {
  /** Left-hand bass note (MIDI). */
  bass: number;
  /** Right-hand notes (MIDI), low to high. */
  notes: number[];
  /** 0 = root position, 1 = first inversion... */
  inversion: number;
}

/**
 * The chord on a keyboard: its bass in the left hand around C3, and the
 * chord tones in close position in the right hand from middle C up —
 * one voicing per inversion.
 */
export function keyboardVoicings(chord: ChordNotes): KeyboardVoicing[] {
  const bassPc = chord.bassPitchClass ?? chord.rootPitchClass;
  // C3 = 48: the bass sits between C3 and B3... or an octave lower for
  // high notes, so it stays clearly apart from the right hand.
  const bass = 36 + bassPc + (bassPc <= 4 ? 12 : 0);

  // Close position: every tone (tensions included) folded into one
  // octave above the root, in order.
  const unique = [
    ...new Set(
      chord.tones
        .map((tone) => mod12(tone.semitones))
        .sort((a, b) => a - b)
        .map((semitones) => mod12(chord.rootPitchClass + semitones)),
    ),
  ];

  const voicings: KeyboardVoicing[] = [];
  const count = Math.min(unique.length, 4);
  for (let inversion = 0; inversion < count; inversion++) {
    const order = unique.slice(inversion).concat(unique.slice(0, inversion));
    const notes: number[] = [];
    // Start at or just above middle C (60), but keep the top in reach.
    for (const pc of order) {
      const previous = notes.length ? notes[notes.length - 1] : 59;
      notes.push(previous + 1 + mod12(pc - (previous + 1)));
    }
    // Keep the right hand from climbing too high.
    while (notes[notes.length - 1] > 84) {
      for (let i = 0; i < notes.length; i++) notes[i] -= 12;
    }
    voicings.push({ bass, notes, inversion });
  }
  return voicings;
}
