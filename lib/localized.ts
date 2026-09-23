import type { LocalizedText } from "@/types/public";

/**
 * Picks the text for `locale` from an API localized map (`{ en, "pt-BR",
 * es }`). Falls back to English (the API requires it), then Portuguese,
 * then whatever non-empty value exists, so a missing translation never
 * renders as a blank line.
 */
export function pickLocalized(
  map: LocalizedText | null | undefined,
  locale: string,
): string {
  if (!map || typeof map !== "object") return "";
  const candidates = [map[locale], map.en, map["pt-BR"], ...Object.values(map)];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}
