/**
 * Client-side checks for the "Importar ChordPro" dialog, run before a
 * file is even read. The API re-checks everything (`CHORDPRO_TOO_LARGE`,
 * `CHORDPRO_INVALID`).
 */

/** Largest accepted file or pasted text, in bytes (same as the API). */
export const CHORDPRO_MAX_BYTES = 64 * 1024;

export const CHORDPRO_EXTENSIONS = [
  ".cho",
  ".chordpro",
  ".chopro",
  ".crd",
  ".pro",
  ".txt",
] as const;

/** The `accept` attribute of the file input. */
export const CHORDPRO_ACCEPT = CHORDPRO_EXTENSIONS.join(",");

export type ChordProFileIssue = "type" | "size" | "empty";

/** Checks a picked or dropped file by name and size. */
export function checkChordProFile(file: {
  name: string;
  size: number;
}): ChordProFileIssue | null {
  const name = file.name.toLowerCase();
  if (!CHORDPRO_EXTENSIONS.some((ext) => name.endsWith(ext))) return "type";
  if (file.size === 0) return "empty";
  if (file.size > CHORDPRO_MAX_BYTES) return "size";
  return null;
}

/** UTF-8 size of a pasted text. */
export function utf8Size(text: string): number {
  return new TextEncoder().encode(text).length;
}
