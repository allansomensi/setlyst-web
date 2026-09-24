import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Metadata helpers for the public site: canonical URLs, `hreflang`
 * alternates and Open Graph, on top of the defaults set by the root
 * layout (`metadataBase`, site name, title template).
 */

/** Open Graph locale codes (`pt_BR`), per app locale. */
const OG_LOCALES: Record<string, string> = {
  en: "en_US",
  "pt-BR": "pt_BR",
  es: "es_ES",
};

/**
 * The public origin, from the same sources the root layout uses for
 * `metadataBase`, with a localhost fallback so the sitemap always has
 * absolute URLs.
 */
export function getSiteOrigin(): string {
  const candidate =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  try {
    return new URL(candidate ?? "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}

/** `/pt-BR/pricing` style paths of `path` in every locale. */
export function localeAlternates(path: string): Record<string, string> {
  const suffix = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `/${locale}${suffix}`;
  }
  languages["x-default"] = `/${routing.defaultLocale}${suffix}`;
  return languages;
}

export function publicPageMetadata({
  locale,
  path,
  title,
  description,
  absoluteTitle = false,
  largeImage = false,
}: {
  locale: string;
  /** Locale-less path (`/pricing`). */
  path: string;
  title: string;
  description: string;
  /** Skip the root "· Setlyst" template (the landing page). */
  absoluteTitle?: boolean;
  /**
   * Show the large link preview card (the site's Open Graph image) on
   * X/Twitter: the landing and pricing pages, which people share.
   */
  largeImage?: boolean;
}): Metadata {
  const url = `/${locale}${path === "/" ? "" : path}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: localeAlternates(path) },
    openGraph: {
      type: "website",
      siteName: "Setlyst",
      title,
      description,
      url,
      locale: OG_LOCALES[locale] ?? "en_US",
      alternateLocale: Object.entries(OG_LOCALES)
        .filter(([code]) => code !== locale)
        .map(([, og]) => og),
    },
    twitter: {
      card: largeImage ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}
