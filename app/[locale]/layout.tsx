import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme_provider";
import { AuthProvider } from "@/components/providers/session_provider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { fetchServerApi } from "@/lib/api-server";
import { UserPreferences } from "@/types/api";

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

  const messages = await getMessages();

  let userTheme: "light" | "dark" | "system" = "system";

  try {
    const preferences = await fetchServerApi<UserPreferences>(
      "/users/me/preferences",
    );

    userTheme = (preferences?.theme as "light" | "dark" | "system") || "system";
  } catch {
    userTheme = "system";
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <ThemeProvider
          key={userTheme}
          attribute="class"
          defaultTheme="system"
          forcedTheme={userTheme !== "system" ? userTheme : undefined}
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" theme={userTheme} />
        </ThemeProvider>
      </AuthProvider>
      <Analytics />
    </NextIntlClientProvider>
  );
}
