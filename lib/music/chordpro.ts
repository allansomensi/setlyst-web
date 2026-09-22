/**
 * ChordPro parsing — pure and framework-free, so what a song *means* is
 * decided once, here, and the renderer only decides how it looks.
 *
 * Lyrics arrive in whatever shape the musician pasted them in: proper
 * ChordPro (`[G]Hello`, `{start_of_chorus}`), Ultimate-Guitar style
 * (`[Chorus]` headings), or the chords-above-the-lyrics layout of most
 * chord sites and PDFs. Headings come in several languages and spellings —
 * `[Pré-Refrão]`, `Pre Chorus 2:`, `pre_refrao`, `{c: Estribillo x2}`.
 * All of that is folded into one small block model.
 */

import { parseChord } from "./chords";

// Sections

export type SectionKey =
  | "intro"
  | "verse"
  | "preChorus"
  | "chorus"
  | "postChorus"
  | "bridge"
  | "interlude"
  | "instrumental"
  | "solo"
  | "guitarSolo"
  | "keyboardSolo"
  | "bassSolo"
  | "drumSolo"
  | "saxSolo"
  | "synthSolo"
  | "riff"
  | "theme"
  | "break"
  | "breakdown"
  | "drop"
  | "vamp"
  | "tag"
  | "hook"
  | "turnaround"
  | "buildUp"
  | "part"
  | "adLib"
  | "spoken"
  | "rap"
  | "fadeOut"
  | "outro"
  | "coda";

/**
 * Every spelling a section is recognised by, already normalised (see
 * `normalizeLabel`): lower case, no accents, hyphens and underscores as
 * spaces. English, Portuguese and Spanish — the app's three languages —
 * plus the handful of French/Italian terms common in charts.
 */
const SECTION_ALIASES: Record<SectionKey, readonly string[]> = {
  intro: [
    "intro",
    "introduction",
    "introducao",
    "introduccion",
    "entrada",
    "abertura",
    "opening",
  ],
  verse: [
    "verse",
    "verses",
    "verso",
    "versos",
    "estrofe",
    "estrofes",
    "estrofa",
    "stanza",
    "strophe",
    "couplet",
  ],
  preChorus: [
    "pre chorus",
    "prechorus",
    "pre refrain",
    "pre refrao",
    "prerefrao",
    "pre coro",
    "precoro",
    "pre estribillo",
    "preestribillo",
    "pre hook",
    "prehook",
  ],
  chorus: [
    "chorus",
    "refrain",
    "refrao",
    "refroes",
    "coro",
    "estribillo",
    "ritornelo",
    "ritornello",
  ],
  postChorus: [
    "post chorus",
    "postchorus",
    "pos chorus",
    "pos refrao",
    "posrefrao",
    "post refrao",
    "pos coro",
    "post coro",
    "postcoro",
    "post estribillo",
    "posestribillo",
  ],
  bridge: ["bridge", "ponte", "puente", "middle 8", "middle eight", "pont"],
  interlude: [
    "interlude",
    "interludio",
    "passagem",
    "pasaje",
    "transition",
    "transicao",
    "transicion",
  ],
  instrumental: [
    "instrumental",
    "instr",
    "inst",
    "parte instrumental",
    "base instrumental",
  ],
  solo: ["solo", "solos", "lead"],
  guitarSolo: [
    "guitar solo",
    "lead guitar",
    "solo guitar",
    "solo de guitarra",
    "solo guitarra",
    "guitarra solo",
    "solo de violao",
    "solo violao",
    "violao solo",
  ],
  keyboardSolo: [
    "keyboard solo",
    "keys solo",
    "piano solo",
    "organ solo",
    "solo de teclado",
    "solo de teclados",
    "solo teclado",
    "teclado solo",
    "solo de piano",
    "solo piano",
    "solo de orgao",
    "solo de organo",
  ],
  bassSolo: [
    "bass solo",
    "solo de baixo",
    "solo baixo",
    "baixo solo",
    "solo de bajo",
    "solo bajo",
  ],
  drumSolo: [
    "drum solo",
    "drums solo",
    "solo de bateria",
    "solo bateria",
    "bateria solo",
  ],
  saxSolo: [
    "sax solo",
    "saxophone solo",
    "solo de sax",
    "solo sax",
    "solo de saxofone",
    "solo de saxofon",
  ],
  synthSolo: [
    "synth solo",
    "synthesizer solo",
    "solo de synth",
    "solo de sintetizador",
    "solo sintetizador",
  ],
  riff: ["riff", "riffs", "dedilhado", "punteo", "ponteado"],
  theme: ["theme", "tema", "melodia", "melody"],
  break: ["break", "parada", "pausa", "breque", "stop", "corte"],
  breakdown: ["breakdown", "queda", "caida"],
  drop: ["drop"],
  vamp: ["vamp"],
  tag: ["tag"],
  hook: ["hook", "gancho"],
  turnaround: ["turnaround", "retorno", "volta"],
  buildUp: ["build up", "buildup", "build", "subida", "crescente"],
  part: ["part", "parte"],
  adLib: [
    "ad lib",
    "adlib",
    "ad libitum",
    "improviso",
    "improvisacao",
    "improvisacion",
  ],
  spoken: [
    "spoken",
    "spoken word",
    "falado",
    "recitado",
    "declamado",
    "narracao",
    "narracion",
    "narration",
  ],
  rap: ["rap"],
  fadeOut: ["fade out", "fadeout", "fade"],
  outro: [
    "outro",
    "ending",
    "end",
    "final",
    "fim",
    "fin",
    "finale",
    "finalizacao",
    "encerramento",
    "saida",
    "cierre",
  ],
  coda: ["coda"],
};

/**
 * Aliases that are also ordinary words. A line reading just "Final" or
 * "Volta" may well be a lyric, so these only count as headings when the
 * line says so explicitly — brackets, braces, a trailing colon, or a
 * number/repeat mark (`[Final]`, `Final:`, `Volta 2`).
 */
const WEAK_ALIASES = new Set([
  "end",
  "fin",
  "fim",
  "final",
  "finale",
  "stop",
  "corte",
  "volta",
  "retorno",
  "lead",
  "tag",
  "hook",
  "drop",
  "tema",
  "theme",
  "melodia",
  "melody",
  "subida",
  "queda",
  "parada",
  "pausa",
  "caida",
  "entrada",
  "abertura",
  "opening",
  "passagem",
  "pasaje",
  "gancho",
  "fade",
  "part",
  "parte",
  "build",
  "crescente",
  "saida",
  "cierre",
  "rap",
  "coro",
  "pont",
  "inst",
  "instr",
  "break",
  "vamp",
  "ending",
  "transition",
  "spoken",
]);

/** Sections drawn as a compact pill: instrumental passages, not lyrics. */
export const PILL_SECTIONS: ReadonlySet<SectionKey> = new Set<SectionKey>([
  "intro",
  "interlude",
  "instrumental",
  "solo",
  "guitarSolo",
  "keyboardSolo",
  "bassSolo",
  "drumSolo",
  "saxSolo",
  "synthSolo",
  "riff",
  "theme",
  "break",
  "breakdown",
  "drop",
  "turnaround",
  "buildUp",
  "fadeOut",
  "coda",
]);

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  primeira: 1,
  primeiro: 1,
  segunda: 2,
  segundo: 2,
  terceira: 3,
  terceiro: 3,
  quarta: 4,
  quarto: 4,
  primera: 1,
  primer: 1,
  tercera: 3,
  tercer: 3,
};

const ROMAN: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
};

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALIAS_TO_KEY = new Map<string, SectionKey>();
for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
  for (const alias of aliases) ALIAS_TO_KEY.set(alias, key as SectionKey);
}

// Longest first, so "guitar solo" wins over "solo" and "pre chorus" over
// "chorus".
const ALIAS_PATTERN = [...ALIAS_TO_KEY.keys()]
  .sort((a, b) => b.length - a.length)
  .map((alias) => escapeRegExp(alias).replace(/ /g, "\\s*"))
  .join("|");

const REPEAT_PATTERN =
  "\\(?\\s*(?:x\\s*(\\d+)|(\\d+)\\s*x|(\\d+)\\s*(?:vezes|veces|times))\\s*\\)?";

/**
 * `[ordinal] alias [number] [repeat] [: or - extra]`, applied to a
 * normalised label. The extra part ("Verse 1 - acoustic") is kept and
 * shown, so nothing the musician wrote is lost.
 */
const HEADING_REGEX = new RegExp(
  "^(?:(\\d+)\\s*(?:a|o|st|nd|rd|th)?\\s+|(" +
    Object.keys(ORDINAL_WORDS).join("|") +
    ")\\s+)?" +
    `(${ALIAS_PATTERN})` +
    "(?:\\s*(\\d+|i{1,3}|iv|vi{0,3}|v)(?![a-z]))?" +
    `(?:\\s*${REPEAT_PATTERN})?` +
    "\\s*(?:(?:[:\\-–—.]|\\s)\\s*(.*?))?\\s*" +
    `(?:${REPEAT_PATTERN})?` +
    "$",
);

/** Lower case, no accents, separators as single spaces. */
export function normalizeLabel(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[ºª°]/g, (m) => (m === "ª" ? "a" : "o"))
    .replace(/[_]+/g, " ")
    .replace(/(\w)[-‐](\w)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SectionHeading {
  key: SectionKey;
  number: string | null;
  repeat: number | null;
  /** Free text after the section name ("acoustic" in "Verse 1 - acoustic"). */
  extra: string | null;
}

/**
 * Recognises a section heading's text, in any of the supported languages
 * and spellings. `explicit` says the text came from a place that is
 * already known to be a heading (brackets, a directive), which relaxes
 * the rule on ambiguous words — see WEAK_ALIASES.
 */
export function parseSectionHeading(
  raw: string,
  explicit: boolean,
): SectionHeading | null {
  const hadColon = /:\s*$/.test(raw.trim());
  const text = normalizeLabel(raw.replace(/:\s*$/, ""));
  if (!text || text.length > 60) return null;

  const match = HEADING_REGEX.exec(text);
  if (!match) return null;

  const [
    ,
    ordinalDigit,
    ordinalWord,
    alias,
    number,
    rep1,
    rep2,
    rep3,
    extra,
    rep4,
    rep5,
    rep6,
  ] = match;

  const aliasKey = alias.replace(/\s+/g, " ");
  const key =
    ALIAS_TO_KEY.get(aliasKey) ?? ALIAS_TO_KEY.get(aliasKey.replace(/ /g, ""));
  if (!key) return null;

  const repeatText = rep1 ?? rep2 ?? rep3 ?? rep4 ?? rep5 ?? rep6 ?? null;
  const ordinal =
    ordinalDigit ?? (ordinalWord ? String(ORDINAL_WORDS[ordinalWord]) : null);
  const resolvedNumber =
    ordinal ??
    (number ? (ROMAN[number] ? String(ROMAN[number]) : number) : null);

  if (!explicit && !hadColon && !resolvedNumber && !repeatText) {
    // A bare line: only unambiguous section names count.
    if (WEAK_ALIASES.has(aliasKey) || extra) return null;
  }
  // Free text after a bare name must be set off explicitly.
  if (!explicit && extra && !hadColon) return null;

  return {
    key,
    number: resolvedNumber,
    repeat: repeatText ? Number(repeatText) : null,
    extra: extra?.trim() ? originalCaseExtra(raw, extra) : null,
  };
}

/**
 * Recovers the extra text with its original capitalisation and accents:
 * the same number of trailing words, taken from the raw text.
 */
function originalCaseExtra(raw: string, normalizedExtra: string): string {
  const count = normalizedExtra.split(" ").length;
  const words = raw.replace(/:\s*$/, "").trim().split(/\s+/);
  const tail = words
    .slice(-count)
    .join(" ")
    .replace(/^[:\-–—.]+\s*/, "");
  return normalizeLabel(tail) === normalizedExtra ? tail : normalizedExtra;
}

// Chords

/** Tokens that sit in chord lines without being chords. */
const CHORD_LINE_FILLER =
  /^(?:\|{1,2}:?|:?\|{1,2}|\/|-{1,3}|–|—|%|\.{1,3}|\(|\)|x\d+|\d+x|\(x?\d+x?\))$/i;

const NO_CHORD = /^(?:N\.?C\.?|n\.?c\.?)$/;

/** A chord symbol, including "N.C." (no chord). */
export function isChordSymbol(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (NO_CHORD.test(trimmed)) return true;
  // Written in parentheses as an optional/passing chord: "(G)".
  const inner = trimmed.replace(/^\((.+)\)$/, "$1");
  return parseChord(inner) !== null;
}

/**
 * Words that are both a chord and a common word ("A", "E" and "Em" are
 * articles/prepositions in Portuguese and Spanish). A line consisting of
 * nothing else is read as a lyric.
 */
const AMBIGUOUS_SINGLE = new Set(["A", "E", "Em"]);

/**
 * Whether a plain-text line (no brackets) is a line of chords, as in the
 * chords-above-lyrics layout: "G    D/F#   Em   C".
 */
function isPlainChordLine(line: string): boolean {
  if (line.includes("[") || line.includes("{")) return false;
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  let chords = 0;
  for (const token of tokens) {
    if (CHORD_LINE_FILLER.test(token)) continue;
    if (!isChordSymbol(token)) return false;
    chords++;
  }
  if (chords === 0) return false;
  if (tokens.length === 1 && AMBIGUOUS_SINGLE.has(tokens[0])) return false;
  return true;
}

/** Whether a line is only bracketed chords and filler: "[G] [D] | [Em]". */
function isBracketChordLine(line: string): boolean {
  const rest = line.replace(/\[([^\]]+)\]/g, (whole, inner: string) =>
    isChordSymbol(inner) ? " " : whole,
  );
  if (rest === line) return false;
  return rest
    .trim()
    .split(/\s+/)
    .every((token) => !token || CHORD_LINE_FILLER.test(token));
}

// Tablature

/** "e|---0---3---|", "B|-1-----|" — a line of guitar/bass tablature. */
const TAB_LINE =
  /^\s*[A-Ga-g][#b]?\s*[|:]\s*[-–0-9hpbrstxX/\\~|().*^<>= ]{3,}\s*$/;

function isTabLine(line: string): boolean {
  return TAB_LINE.test(line) && (line.match(/-/g)?.length ?? 0) >= 3;
}

// Normalisation

/**
 * Rewrites the layouts people paste into proper inline ChordPro, so that
 * transposition and rendering only ever deal with one format:
 *
 *  - Chords written on the line *above* the lyric are merged into it at
 *    the same column: "G      D" over "Hello old friend" becomes
 *    "[G]Hello ol[D]d friend".
 *  - A line of plain chords with no lyric under it becomes a line of
 *    bracketed chords, spacing preserved.
 *  - "[Intro] G D Em C" and "Intro: G D" are split into a heading and a
 *    chord line.
 *
 * Idempotent: running it on its own output changes nothing.
 */
export function normalizeChordPro(content: string): string {
  const lines = content
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/ /g, " ")
    .split("\n");

  // Split "heading + chords" lines first.
  const split: string[] = [];
  for (const line of lines) {
    const bracketed = /^\s*\[([^\]]+)\]\s+(.+)$/.exec(line);
    if (
      bracketed &&
      !isChordSymbol(bracketed[1]) &&
      parseSectionHeading(bracketed[1], true) &&
      (isPlainChordLine(bracketed[2]) || isBracketChordLine(bracketed[2]))
    ) {
      split.push(`[${bracketed[1].trim()}]`, bracketed[2]);
      continue;
    }
    const labelled = /^\s*([^:[\]{}]{2,40}):\s*(.+)$/.exec(line);
    if (
      labelled &&
      parseSectionHeading(labelled[1], true) &&
      (isPlainChordLine(labelled[2]) || isBracketChordLine(labelled[2]))
    ) {
      split.push(`[${labelled[1].trim()}]`, labelled[2]);
      continue;
    }
    split.push(line);
  }

  const out: string[] = [];
  for (let i = 0; i < split.length; i++) {
    const line = split[i];
    if (!isPlainChordLine(line) || isTabLine(line)) {
      out.push(line);
      continue;
    }

    const next = split[i + 1];
    const nextIsLyric =
      next !== undefined &&
      next.trim() !== "" &&
      !next.trim().startsWith("{") &&
      !next.trim().startsWith("#") &&
      !/\[[^\]]+\]/.test(next) &&
      !isPlainChordLine(next) &&
      !isTabLine(next) &&
      !parseSectionHeading(next, false);

    if (nextIsLyric) {
      out.push(mergeChordsIntoLyric(line, next));
      i++;
    } else {
      out.push(bracketPlainChords(line));
    }
  }

  return out.join("\n");
}

function chordColumns(line: string): Array<{ column: number; text: string }> {
  const result: Array<{ column: number; text: string }> = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    result.push({ column: match.index, text: match[0] });
  }
  return result;
}

function mergeChordsIntoLyric(chordLine: string, lyric: string): string {
  const tokens = chordColumns(chordLine).filter(
    (token) => !CHORD_LINE_FILLER.test(token.text),
  );
  const lastColumn = tokens.length ? tokens[tokens.length - 1].column : 0;
  let result = lyric.length < lastColumn ? lyric.padEnd(lastColumn) : lyric;

  // Right to left, so earlier columns stay valid as text is inserted.
  for (let t = tokens.length - 1; t >= 0; t--) {
    const { column, text } = tokens[t];
    const chord = text.replace(/^\((.+)\)$/, "$1");
    result = `${result.slice(0, column)}[${chord}]${result.slice(column)}`;
  }
  return result.replace(/\s+$/, "");
}

function bracketPlainChords(line: string): string {
  return line.replace(/\S+/g, (token) =>
    CHORD_LINE_FILLER.test(token) ? token : `[${token}]`,
  );
}

// Block model

export interface Segment {
  chord: string | null;
  text: string;
}

/** A run of segments with no whitespace between them — one visual word. */
export type Word = Segment[];

export type InlinePart =
  { type: "text"; text: string } | { type: "annotation"; text: string };

export type Block =
  | {
      type: "heading";
      key: SectionKey | null;
      heading: SectionHeading | null;
      /** Original text, for headings that aren't a known section. */
      raw: string;
    }
  | {
      type: "lyric";
      /** The line split into words, each a run of chord/text segments. */
      words: Word[];
      hasChords: boolean;
      chorus: boolean;
    }
  | {
      type: "chords";
      /** Chords and filler ("|", "x2") in order. */
      items: Array<{ chord: boolean; text: string }>;
      chorus: boolean;
    }
  | { type: "comment"; text: string; style: "normal" | "italic" | "box" }
  | { type: "tab"; lines: string[]; label: string | null }
  | { type: "chorusRepeat"; label: string | null }
  | { type: "capo"; fret: string }
  | { type: "blank" };

interface DirectiveMatch {
  name: string;
  value: string | null;
}

function parseDirective(line: string): DirectiveMatch | null {
  const match = /^\{\s*([^:}]+?)\s*(?::\s*([^}]*?))?\s*\}$/.exec(line.trim());
  if (!match) return null;
  return { name: match[1].toLowerCase(), value: match[2] ?? null };
}

const ENV_ALIASES: Record<string, string> = {
  soc: "chorus",
  sov: "verse",
  sob: "bridge",
  sot: "tab",
  sog: "grid",
  eoc: "chorus",
  eov: "verse",
  eob: "bridge",
  eot: "tab",
  eog: "grid",
};

const ENV_SECTION: Record<string, SectionKey> = {
  chorus: "chorus",
  verse: "verse",
  bridge: "bridge",
};

const IGNORED_DIRECTIVES = new Set([
  "title",
  "t",
  "subtitle",
  "st",
  "artist",
  "composer",
  "lyricist",
  "arranger",
  "album",
  "year",
  "copyright",
  "key",
  "tempo",
  "time",
  "duration",
  "meta",
  "tag",
  "define",
  "chord",
  "new_page",
  "np",
  "new_physical_page",
  "npp",
  "column_break",
  "colb",
  "columns",
  "col",
  "pagetype",
  "titles",
  "textfont",
  "textsize",
  "textcolour",
  "textcolor",
  "chordfont",
  "chordsize",
  "chordcolour",
  "chordcolor",
  "tabfont",
  "tabsize",
  "grid",
  "no_grid",
  "g",
  "ng",
]);

function splitLyricLine(line: string): {
  words: Word[];
  hasChords: boolean;
} {
  const segments: Segment[] = [];
  let current: Segment = { chord: null, text: "" };
  let hasChords = false;
  const regex = /\[([^\]]*)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    current.text += line.slice(last, match.index);
    const inner = match[1];
    if (isChordSymbol(inner)) {
      if (current.chord !== null || current.text) segments.push(current);
      current = { chord: inner.trim().replace(/^\((.+)\)$/, "($1)"), text: "" };
      hasChords = true;
    } else {
      // "[x2]", "[risos]": an annotation, kept with the lyric.
      current.text += `⁣${inner}⁣`;
    }
    last = regex.lastIndex;
  }
  current.text += line.slice(last);
  if (current.chord !== null || current.text) segments.push(current);

  // A chord that landed on the space *before* a word (common when chords
  // are typed or merged a column early) belongs to that word: move the
  // space to the previous segment. Otherwise the chord sits over a lone
  // space and pushes the words apart ("my  old").
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const lead = /^(\s+)(?=\S)/.exec(segment.text);
    if (segment.chord === null || !lead) continue;
    segment.text = segment.text.slice(lead[1].length);
    if (i > 0 && !/\s$/.test(segments[i - 1].text)) {
      segments[i - 1].text += lead[1];
    }
  }

  // Leading indentation before the first chord is layout noise.
  if (segments.length && segments[0].chord === null) {
    segments[0].text = segments[0].text.replace(/^\s+/, "");
    if (!segments[0].text) segments.shift();
  }
  if (segments.length) {
    const tail = segments[segments.length - 1];
    tail.text = tail.text.replace(/\s+$/, "");
  }

  // Break segments at whitespace so a long line can wrap between words,
  // and group segments that touch (a chord mid-word) so it never wraps
  // inside one.
  const words: Word[] = [];
  let word: Word = [];
  const flush = () => {
    if (word.length) words.push(word);
    word = [];
  };

  for (const segment of segments) {
    // Each part is a word plus the whitespace after it. (Not a lookbehind
    // split: those are a syntax error on Safari before 16.4.)
    const parts = segment.text.match(/\S*\s*/g)?.filter(Boolean) ?? [];
    parts.forEach((part, index) => {
      word.push({ chord: index === 0 ? segment.chord : null, text: part });
      if (/\s$/.test(part)) flush();
    });
    if (parts.length === 0) word.push({ chord: segment.chord, text: "" });
  }
  flush();

  return { words, hasChords };
}

/** Marker used to carry inline annotations through segment splitting. */
export const ANNOTATION_MARK = "⁣";

/**
 * Parses (normalised) ChordPro into blocks. Blank lines are kept as
 * `blank` blocks; collapsing them is left to the renderer, because what
 * counts as a redundant gap depends on what it chooses to show.
 */
export function parseChordPro(content: string): Block[] {
  const lines = normalizeChordPro(content).split("\n");
  const blocks: Block[] = [];

  let section: SectionKey | null = null;
  let envSection: SectionKey | null = null;
  let tab: { lines: string[]; label: string | null; env: boolean } | null =
    null;

  const inChorus = () => (envSection ?? section) === "chorus";

  const pushHeading = (
    raw: string,
    explicit: boolean,
    fallback?: SectionKey,
  ) => {
    const heading = raw.trim() ? parseSectionHeading(raw, explicit) : null;
    const key = heading?.key ?? fallback ?? null;
    blocks.push({ type: "heading", key, heading, raw: raw.trim() });
    section = key;
  };

  const closeTab = () => {
    if (tab && tab.lines.length) {
      // Trailing blank lines inside a tab block are padding, not content.
      while (tab.lines.length && !tab.lines[tab.lines.length - 1].trim()) {
        tab.lines.pop();
      }
      blocks.push({ type: "tab", lines: tab.lines, label: tab.label });
    }
    tab = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();

    // Inside {start_of_tab}: everything verbatim until the end marker.
    if (tab?.env) {
      const dir = parseDirective(trimmed);
      const name = dir ? (ENV_ALIASES[dir.name] ?? dir.name) : "";
      if (
        dir &&
        (name === "tab" || name === "grid" || /^end_of_/.test(dir.name))
      ) {
        closeTab();
        continue;
      }
      tab.lines.push(line);
      continue;
    }

    // Loose tablature lines, grouped.
    if (isTabLine(line)) {
      if (!tab) tab = { lines: [], label: null, env: false };
      tab.lines.push(line);
      continue;
    }
    if (tab) closeTab();

    if (!trimmed) {
      blocks.push({ type: "blank" });
      continue;
    }

    if (trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const dir = parseDirective(trimmed);
      if (dir) {
        const { name, value } = dir;
        const envName = ENV_ALIASES[name];

        const start = /^start_of_(.+)$/.exec(name);
        if (start || (envName && name.startsWith("so"))) {
          const env = start ? start[1] : envName;
          if (env === "tab" || env === "grid") {
            tab = { lines: [], label: value, env: true };
            continue;
          }
          const fallback =
            ENV_SECTION[env] ??
            parseSectionHeading(env.replace(/_/g, " "), true)?.key;
          pushHeading(value ?? "", true, fallback ?? undefined);
          if (!value && !fallback) {
            // {start_of_something} with nothing recognisable: still a
            // heading, named after the environment.
            const last = blocks[blocks.length - 1];
            if (last.type === "heading") last.raw = env.replace(/_/g, " ");
          }
          envSection = section;
          continue;
        }
        if (/^end_of_/.test(name) || (envName && name.startsWith("eo"))) {
          envSection = null;
          section = null;
          continue;
        }

        if (name === "chorus") {
          blocks.push({ type: "chorusRepeat", label: value });
          continue;
        }

        if (name === "capo") {
          if (value && /^\d{1,2}$/.test(value) && value !== "0") {
            blocks.push({ type: "capo", fret: value });
          }
          continue;
        }

        if (
          name === "c" ||
          name === "comment" ||
          name === "ci" ||
          name === "comment_italic" ||
          name === "cb" ||
          name === "comment_box" ||
          name === "highlight"
        ) {
          const text = value ?? "";
          if (!text) continue;
          const heading = parseSectionHeading(text, true);
          if (heading) {
            pushHeading(text, true);
            continue;
          }
          blocks.push({
            type: "comment",
            text,
            style:
              name === "ci" || name === "comment_italic"
                ? "italic"
                : name === "cb" || name === "comment_box"
                  ? "box"
                  : "normal",
          });
          continue;
        }

        if (IGNORED_DIRECTIVES.has(name)) continue;

        // "{Refrão}", "{Verse 2}": braces used as a heading.
        const asHeading = parseSectionHeading(
          value ? `${name}: ${value}` : name,
          true,
        );
        if (asHeading) {
          pushHeading(value ? `${name}: ${value}` : name, true);
        }
        continue;
      }
    }

    // A line that is only "[Something]": a heading. Chords first — "[G]"
    // alone is a chord, not a section called G.
    const bracketOnly = /^\[([^\]]+)\]$/.exec(trimmed);
    if (bracketOnly && !isChordSymbol(bracketOnly[1])) {
      pushHeading(bracketOnly[1], true);
      continue;
    }

    // A bare "Refrão", "Pre-Chorus 2:", "Solo de guitarra (2x)".
    if (!trimmed.includes("[") && trimmed.length <= 60) {
      const bare = parseSectionHeading(trimmed, false);
      if (bare) {
        pushHeading(trimmed, false);
        continue;
      }
    }

    if (isBracketChordLine(trimmed)) {
      const items: Array<{ chord: boolean; text: string }> = [];
      const regex = /\[([^\]]+)\]|(\S+)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(trimmed)) !== null) {
        if (match[1] !== undefined) {
          items.push({ chord: true, text: match[1].trim() });
        } else {
          items.push({ chord: false, text: match[2] });
        }
      }
      blocks.push({ type: "chords", items, chorus: inChorus() });
      continue;
    }

    const { words, hasChords } = splitLyricLine(line);
    if (words.length) {
      blocks.push({ type: "lyric", words, hasChords, chorus: inChorus() });
    }
  }
  closeTab();

  return blocks;
}

/** Splits text on the annotation marker into plain and annotation parts. */
export function splitAnnotations(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pieces = text.split(ANNOTATION_MARK);
  pieces.forEach((piece, index) => {
    if (!piece) return;
    parts.push({ type: index % 2 === 1 ? "annotation" : "text", text: piece });
  });
  return parts;
}
