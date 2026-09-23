/**
 * PDF export options — the client-side model of the API's `ExportQuery`
 * (`setlyst-api/src/export/pdf.rs`). Isomorphic: used by the export
 * dialog, the settings page (saved defaults) and the server.
 */

export const CHORD_MODES = ["above", "inline", "hide"] as const;
export const PAPER_FORMATS = ["a4", "letter", "legal"] as const;
export const ORIENTATIONS = ["portrait", "landscape"] as const;
export const MARGIN_SIZES = ["narrow", "normal", "wide"] as const;
export const FONT_SCALES = [70, 85, 100, 115, 130, 150, 175, 200] as const;
export const MAX_SUBTITLE_LENGTH = 120;

export type ChordMode = (typeof CHORD_MODES)[number];
export type PaperFormat = (typeof PAPER_FORMATS)[number];
export type Orientation = (typeof ORIENTATIONS)[number];
export type MarginSize = (typeof MARGIN_SIZES)[number];

/** Boolean switches, grouped for the dialog. */
export const CONTENT_TOGGLES = [
  "show_title",
  "show_description",
  "show_band_name",
  "show_date",
  "show_total_duration",
  "show_numbers",
  "show_artist",
  "show_key",
  "show_bpm",
  "show_song_duration",
  "show_tags",
  "show_blocks",
  "show_breaks",
] as const;

export const LAYOUT_TOGGLES = [
  "compact",
  "uppercase_titles",
  "watermark",
  "page_numbers",
] as const;

export type ContentToggle = (typeof CONTENT_TOGGLES)[number];
export type LayoutToggle = (typeof LAYOUT_TOGGLES)[number];

export interface PdfExportOptions extends Record<
  ContentToggle | LayoutToggle,
  boolean
> {
  include_lyrics: boolean;
  chords: ChordMode;
  page_break_per_song: boolean;
  columns: 1 | 2;
  font_scale: number;
  paper: PaperFormat;
  orientation: Orientation;
  margins: MarginSize;
}

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  show_title: true,
  show_description: false,
  show_band_name: true,
  show_date: false,
  show_total_duration: true,
  show_numbers: true,
  show_artist: false,
  show_key: true,
  show_bpm: true,
  show_song_duration: false,
  show_tags: false,
  show_blocks: true,
  show_breaks: true,
  compact: false,
  uppercase_titles: false,
  watermark: true,
  page_numbers: true,
  include_lyrics: false,
  chords: "above",
  page_break_per_song: false,
  columns: 1,
  font_scale: 100,
  paper: "a4",
  orientation: "portrait",
  margins: "normal",
};

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Coerces anything (a stored settings blob from an older build, a
 * hand-edited value) into a complete, valid option set.
 */
export function normalizePdfOptions(raw: unknown): PdfExportOptions {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = { ...DEFAULT_PDF_OPTIONS };

  for (const key of [...CONTENT_TOGGLES, ...LAYOUT_TOGGLES] as const) {
    if (typeof source[key] === "boolean") result[key] = source[key] as boolean;
  }
  if (typeof source.include_lyrics === "boolean") {
    result.include_lyrics = source.include_lyrics;
  }
  if (typeof source.page_break_per_song === "boolean") {
    result.page_break_per_song = source.page_break_per_song;
  }

  result.chords = pick(source.chords, CHORD_MODES, result.chords);
  result.paper = pick(source.paper, PAPER_FORMATS, result.paper);
  result.orientation = pick(
    source.orientation,
    ORIENTATIONS,
    result.orientation,
  );
  result.margins = pick(source.margins, MARGIN_SIZES, result.margins);
  result.columns = source.columns === 2 ? 2 : 1;

  if (
    typeof source.font_scale === "number" &&
    Number.isFinite(source.font_scale)
  ) {
    result.font_scale = Math.round(
      Math.min(200, Math.max(60, source.font_scale)),
    );
  }

  return result;
}

/** The query string sent to the export endpoint. */
export function pdfOptionsToQuery(
  options: PdfExportOptions,
  extra: { lang: string; subtitle?: string | null },
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    params.set(key, String(value));
  }
  params.set("lang", extra.lang);
  const subtitle = extra.subtitle?.trim().slice(0, MAX_SUBTITLE_LENGTH);
  if (subtitle) params.set("subtitle", subtitle);
  return params.toString();
}

/** Ready-made combinations offered as one-click starting points. */
export const PDF_PRESETS: Record<
  "stage" | "compact" | "songbook" | "large",
  Partial<PdfExportOptions>
> = {
  stage: {
    compact: false,
    columns: 1,
    font_scale: 130,
    include_lyrics: false,
    show_key: true,
    show_bpm: true,
    show_artist: false,
    uppercase_titles: true,
  },
  compact: {
    compact: true,
    columns: 2,
    font_scale: 85,
    include_lyrics: false,
    show_artist: true,
  },
  songbook: {
    compact: false,
    columns: 1,
    font_scale: 100,
    include_lyrics: true,
    chords: "above",
    page_break_per_song: true,
    show_artist: true,
  },
  large: {
    compact: false,
    columns: 1,
    font_scale: 175,
    include_lyrics: false,
    uppercase_titles: true,
    margins: "narrow",
  },
};
