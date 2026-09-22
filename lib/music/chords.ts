/**
 * Chord transposition.
 *
 * Pure and framework-free so the musical rules can be reasoned about — and
 * tested — on their own, away from rendering.
 *
 * The hard part is not moving pitches, it is *spelling* them. Transposing
 * a song in C up one semitone gives Db major, not C# major: the same
 * sounds, but Db is written with five flats where C# needs seven sharps,
 * so every chart in the world writes Db. An implementation that always
 * reaches for sharps produces "A#" where "Bb" belongs, and a musician
 * reading it notices immediately.
 *
 * So spelling is decided once, from the *target key*, and then applied to
 * every chord in the song — which is what a transposing musician does and
 * what a published chart shows.
 */

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

const FLAT_NAMES = [
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

/** Semitones above C for each natural note. */
const NATURAL_PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * The conventional written form of each major key, chosen by key
 * signature: whichever spelling needs fewer accidentals. F# and Gb are a
 * genuine tie at six each, where F# is the commoner choice on guitar.
 */
const MAJOR_KEY_BY_PITCH_CLASS = [
  "C", // 0 accidentals
  "Db", // 5 flats, against C#'s 7 sharps
  "D", // 2 sharps
  "Eb", // 3 flats
  "E", // 4 sharps
  "F", // 1 flat
  "F#", // 6 sharps — tie with Gb
  "G", // 1 sharp
  "Ab", // 4 flats
  "A", // 3 sharps
  "Bb", // 2 flats
  "B", // 5 sharps
] as const;

/** The same, for minor keys, via each one's relative major. */
const MINOR_KEY_BY_PITCH_CLASS = [
  "Cm", // rel. Eb — 3 flats
  "C#m", // rel. E — 4 sharps
  "Dm", // rel. F — 1 flat
  "Ebm", // rel. Gb — 6 flats
  "Em", // rel. G — 1 sharp
  "Fm", // rel. Ab — 4 flats
  "F#m", // rel. A — 3 sharps
  "Gm", // rel. Bb — 2 flats
  "G#m", // rel. B — 5 sharps
  "Am", // rel. C — 0
  "Bbm", // rel. Db — 5 flats
  "Bm", // rel. D — 2 sharps
] as const;

/**
 * Each key's signature: positive counts sharps, negative counts flats.
 *
 * This, and not the spelling of the tonic, is what decides how the chords
 * in a key are written. F major's tonic is a plain "F", yet the key has a
 * flat in it and its fourth degree is Bb — never A#. Reading the
 * preference off the tonic instead gets every such key wrong: F, Dm, C
 * and Am all have natural tonics but only two of them want sharps.
 */
const MAJOR_SIGNATURE = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5] as const;
const MINOR_SIGNATURE = [-3, 4, -1, -6, 1, -4, 3, -2, 5, 0, -5, 2] as const;

/**
 * The suffixes a chord symbol may carry after its root.
 *
 * Deliberately a closed set rather than "anything up to a slash". Section
 * headings in these lyrics are bracketed exactly like chords —
 * `[Chorus]`, `[Bridge]`, `[Coda]` — and several of them begin with a
 * letter that is also a note name. Accepting any suffix would transpose
 * `[Bridge]` into `[C#ridge]`. Requiring the suffix to be built only from
 * real chord vocabulary means those headings simply fail to parse and are
 * left untouched.
 */
const CHORD_SUFFIX_TOKEN =
  "(?:maj|min|sus|add|aug|dim|alt|M|m|°|º|ø|Δ|\\+|-|[#b]|\\d|\\(|\\)|,)";

const CHORD_PATTERN = new RegExp(
  `^([A-G])([#b]{0,2})(${CHORD_SUFFIX_TOKEN}*)(?:/([A-G])([#b]{0,2}))?$`,
);

export interface ParsedChord {
  rootPitchClass: number;
  suffix: string;
  bassPitchClass: number | null;
}

function accidentalOffset(accidentals: string): number {
  let offset = 0;
  for (const character of accidentals) {
    if (character === "#") offset += 1;
    else if (character === "b") offset -= 1;
  }
  return offset;
}

function pitchClassOf(letter: string, accidentals: string): number {
  const base = NATURAL_PITCH_CLASS[letter];
  return (((base + accidentalOffset(accidentals)) % 12) + 12) % 12;
}

/** Parses a chord symbol, or returns null if it isn't one. */
export function parseChord(symbol: string): ParsedChord | null {
  const match = CHORD_PATTERN.exec(symbol.trim());
  if (!match) return null;

  const [, letter, accidentals, suffix, bassLetter, bassAccidentals] = match;

  return {
    rootPitchClass: pitchClassOf(letter, accidentals),
    suffix,
    bassPitchClass: bassLetter
      ? pitchClassOf(bassLetter, bassAccidentals ?? "")
      : null,
  };
}

function spell(pitchClass: number, preferFlats: boolean): string {
  const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
  return names[((pitchClass % 12) + 12) % 12];
}

/**
 * Transposes a single chord symbol. Returns the input unchanged when it
 * isn't a chord, so callers can run this over everything in brackets.
 *
 * The bass note of a slash chord is transposed too — `C/E` up two is
 * `D/F#`, not `D/E`. Leaving it behind is the classic way to turn a
 * working chart into a broken one, because the error is invisible until
 * someone plays it.
 */
export function transposeChord(
  symbol: string,
  semitones: number,
  preferFlats: boolean,
): string {
  const parsed = parseChord(symbol);
  if (!parsed) return symbol;

  const root = spell(parsed.rootPitchClass + semitones, preferFlats);
  const bass =
    parsed.bassPitchClass === null
      ? null
      : spell(parsed.bassPitchClass + semitones, preferFlats);

  return `${root}${parsed.suffix}${bass ? `/${bass}` : ""}`;
}

export interface ParsedKey {
  pitchClass: number;
  isMinor: boolean;
}

/** Parses a stored tonality such as "G", "Bb" or "F#m". */
export function parseKey(
  tonality: string | null | undefined,
): ParsedKey | null {
  if (!tonality) return null;

  const match = /^([A-G])([#b]{0,2})(m)?$/.exec(tonality.trim());
  if (!match) return null;

  return {
    pitchClass: pitchClassOf(match[1], match[2]),
    isMinor: Boolean(match[3]),
  };
}

/** The conventional name of a key, given its pitch class and mode. */
export function spellKey(pitchClass: number, isMinor: boolean): string {
  const index = ((pitchClass % 12) + 12) % 12;
  return isMinor
    ? MINOR_KEY_BY_PITCH_CLASS[index]
    : MAJOR_KEY_BY_PITCH_CLASS[index];
}

/** The key reached by transposing `tonality`, or null if it isn't parseable. */
export function transposeKey(
  tonality: string | null | undefined,
  semitones: number,
): string | null {
  const key = parseKey(tonality);
  if (!key) return null;
  return spellKey(key.pitchClass + semitones, key.isMinor);
}

/**
 * Whether the transposed song should be written with flats.
 *
 * Driven by the destination key rather than by the direction of travel:
 * going *up* from F lands on Gb territory just as readily as going down
 * does, and it is the key that decides, not the journey.
 *
 * When the song has no stored key, the first chord is used as a stand-in.
 * That is the usual convention and it is right far more often than not —
 * and since this only picks between two spellings of the same sound, being
 * wrong costs readability, never correctness.
 */
export function shouldPreferFlats(
  tonality: string | null | undefined,
  semitones: number,
  fallbackChord?: string | null,
): boolean {
  const key = parseKey(tonality) ?? inferKeyFromChord(fallbackChord);
  if (!key) return false;

  return keySignature(key.pitchClass + semitones, key.isMinor) < 0;
}

/** Sharps as positive, flats as negative. See MAJOR_SIGNATURE. */
export function keySignature(pitchClass: number, isMinor: boolean): number {
  const index = ((pitchClass % 12) + 12) % 12;
  return isMinor ? MINOR_SIGNATURE[index] : MAJOR_SIGNATURE[index];
}

function inferKeyFromChord(
  symbol: string | null | undefined,
): ParsedKey | null {
  if (!symbol) return null;
  const parsed = parseChord(symbol);
  if (!parsed) return null;

  // "m" not followed by "aj" — so m, m7, m9 count as minor while maj7
  // does not.
  const isMinor = /^m(?!aj)/.test(parsed.suffix);
  return { pitchClass: parsed.rootPitchClass, isMinor };
}

/** The first chord symbol in a ChordPro document, if any. */
export function findFirstChord(content: string): string | null {
  const matches = content.matchAll(/\[([^\]]+)\]/g);
  for (const match of matches) {
    if (parseChord(match[1])) return match[1];
  }
  return null;
}

/**
 * Transposes every chord in a ChordPro document, leaving everything else —
 * lyrics, `{directives}`, and bracketed section headings — exactly as it
 * was. See CHORD_SUFFIX_TOKEN for how headings are told apart from chords.
 */
export function transposeChordPro(
  content: string,
  semitones: number,
  preferFlats: boolean,
): string {
  if (semitones === 0) return content;

  return content.replace(/\[([^\]]+)\]/g, (whole, inner: string) => {
    const transposed = transposeChord(inner, semitones, preferFlats);
    return transposed === inner ? whole : `[${transposed}]`;
  });
}
