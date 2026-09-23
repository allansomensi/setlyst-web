import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme_provider";
import { ThemeSync } from "@/components/providers/theme-sync";
import { AuthProvider } from "@/components/providers/session_provider";
import { OfflineSyncProvider } from "@/components/providers/offline-sync-provider";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getMyPreferences } from "@/lib/server-data";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserTheme } from "@/types/api";
import { getNonce } from "@/lib/server/nonce";

function isUserTheme(value: unknown): value is UserTheme {
  return value === "light" || value === "dark" || value === "system";
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as never)) {
    notFound();
  }

  const [messages, nonce] = await Promise.all([getMessages(), getNonce()]);

  let userTheme: UserTheme | null = null;

  // Only fetch preferences when the user is authenticated; skip the API round-trip
  // on public pages (login, register) to avoid unnecessary latency and silent errors.
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(
    session && session.error !== "TokenExpired" && session.user?.id,
  );

  if (isAuthenticated) {
    try {
      const preferences = await getMyPreferences();
      userTheme = isUserTheme(preferences?.theme) ? preferences.theme : null;
    } catch {
      // Graceful degradation: keep whatever this device last used.
      userTheme = null;
    }
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <OfflineSyncProvider>
          {/* Never remounted: changing the theme must not reset the page
              (open dialogs, scroll, Live Mode). The saved preference is
              the initial default and ThemeSync keeps it in step. */}
          <ThemeProvider
            attribute="class"
            defaultTheme={userTheme ?? "system"}
            enableSystem
            disableTransitionOnChange
            nonce={nonce}
          >
            {userTheme && <ThemeSync theme={userTheme} />}
            {children}
            <Toaster position="top-center" />
          </ThemeProvider>
        </OfflineSyncProvider>
      </AuthProvider>
      <Analytics />
    </NextIntlClientProvider>
  );
}
