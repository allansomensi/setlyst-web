import { cookies, headers } from "next/headers";
import type { AbstractIntlMessages } from "next-intl";
import { routing } from "@/i18n/routing";
import { isAppLocale, negotiateLocale, type AppLocale } from "@/i18n/locales";

/**
 * Locale for the public share pages, which live outside the `[locale]`
 * segment (links are opened by people without an account and shouldn't be
 * bounced through locale negotiation just to read a running order).
 *
 * In order: an explicit `?lang=` (set by the page's own language picker,
 * so the choice survives a reload and travels with a re-shared link), the
 * app's `NEXT_LOCALE` cookie (someone who uses Setlyst already chose), the
 * browser's `Accept-Language`, then the default.
 */
export async function resolvePublicLocale(
  lang: string | string[] | undefined,
): Promise<{ locale: AppLocale; messages: AbstractIntlMessages }> {
  const requested = Array.isArray(lang) ? lang[0] : lang;

  let locale: AppLocale | null = isAppLocale(requested) ? requested : null;

  if (!locale) {
    const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
    if (isAppLocale(cookieLocale)) locale = cookieLocale;
  }

  if (!locale) {
    locale = negotiateLocale((await headers()).get("accept-language"));
  }

  const resolved = locale ?? routing.defaultLocale;
  const messages = (await import(`../../messages/${resolved}.json`))
    .default as AbstractIntlMessages;

  return { locale: resolved, messages };
}
