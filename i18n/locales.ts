import { routing } from "./routing";

export type AppLocale = (typeof routing.locales)[number];

/**
 * Each language named in itself, so someone who can't read the current
 * UI language can still find their own in a picker.
 */
export const LOCALE_NAMES: Record<AppLocale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
};

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" &&
    (routing.locales as readonly string[]).includes(value)
  );
}

/**
 * Picks the best supported locale from an `Accept-Language` header —
 * exact match first (`pt-BR`), then by base language (`pt-PT` → `pt-BR`,
 * `es-AR` → `es`), in the header's own preference order.
 */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
): AppLocale | null {
  if (!acceptLanguage) return null;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const exact = routing.locales.find(
      (l) => l.toLowerCase() === tag.toLowerCase(),
    );
    if (exact) return exact;
    const base = tag.split("-")[0].toLowerCase();
    const byBase = routing.locales.find(
      (l) => l.split("-")[0].toLowerCase() === base,
    );
    if (byBase) return byBase;
  }
  return null;
}
