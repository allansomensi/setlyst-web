/**
 * Song tags, mirrored from the API (`setlyst-api/src/validations/tag.rs`)
 * so the tag input can reject a bad tag as it's typed.
 */

export const MAX_TAG_LENGTH = 30;
export const MAX_TAGS_PER_SONG = 10;

const ALLOWED = /^[\p{L}\p{N} \-_&']+$/u;

/** Lowercase, trimmed, inner whitespace collapsed; `null` when empty. */
export function normalizeTag(raw: string): string | null {
  const normalized = raw.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
  return normalized || null;
}

export type TagIssue = "too_long" | "characters";

export function tagIssue(tag: string): TagIssue | null {
  if (Array.from(tag).length > MAX_TAG_LENGTH) return "too_long";
  if (!ALLOWED.test(tag)) return "characters";
  return null;
}

/** Normalizes and de-duplicates, keeping order; drops invalid entries. */
export function normalizeTags(raw: readonly string[]): string[] {
  const result: string[] = [];
  for (const value of raw) {
    const tag = normalizeTag(value);
    if (tag && !tagIssue(tag) && !result.includes(tag)) result.push(tag);
  }
  return result.slice(0, MAX_TAGS_PER_SONG);
}
