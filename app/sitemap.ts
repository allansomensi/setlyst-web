import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { LEGAL_DOCUMENTS, LEGAL_HREFS, LEGAL_VERSION } from "@/lib/legal";
import { getSiteOrigin, localeAlternates } from "@/lib/seo";

/** The public site in every language, with `hreflang` alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const pages: {
    path: string;
    priority: number;
    changeFrequency: "weekly" | "monthly" | "yearly";
    lastModified?: string;
  }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/changelog", priority: 0.6, changeFrequency: "weekly" },
    ...LEGAL_DOCUMENTS.map((doc) => ({
      path: LEGAL_HREFS[doc],
      priority: 0.3,
      changeFrequency: "yearly" as const,
      lastModified: LEGAL_VERSION,
    })),
  ];

  return pages.flatMap((page) => {
    const languages = Object.fromEntries(
      Object.entries(localeAlternates(page.path)).map(([lang, href]) => [
        lang,
        `${origin}${href}`,
      ]),
    );
    return routing.locales.map((locale) => ({
      url: languages[locale],
      lastModified: page.lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages },
    }));
  });
}
