import type { ReactNode } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { ThemeProvider } from "@/components/providers/theme_provider";
import { resolvePublicLocale } from "@/components/public/resolve-public-locale";
import { getNonce } from "@/lib/server/nonce";

/** Just what the share pages' 404 and error screens read. */
const NAMESPACES = ["publicPage", "common", "error", "notFound"] as const;

/**
 * Layout for the public share routes (/s/[token], /g/[token]).
 *
 * The page itself brings its own providers (PublicShell), but the 404
 * and error screens render *around* the page, where those don't reach;
 * without this they fell back to Next's bare English 404. Only the
 * translations and theme are provided here (no toaster: the page has
 * one), in the visitor's locale from their cookie or browser (a layout
 * can't read the page's `?lang=`).
 *
 * next-themes renders a nested ThemeProvider as a no-op, so the page's
 * own one doesn't conflict.
 */
export async function PublicLinkLayout({ children }: { children: ReactNode }) {
  const [{ locale, messages }, nonce] = await Promise.all([
    resolvePublicLocale(undefined),
    getNonce(),
  ]);
  const subset = Object.fromEntries(
    NAMESPACES.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]),
  ) as AbstractIntlMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={subset} timeZone="UTC">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        nonce={nonce}
      >
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
