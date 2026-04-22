import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme_provider";
import { AuthProvider } from "@/components/providers/session_provider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-center" theme="system" />
        </ThemeProvider>
      </AuthProvider>
      <Analytics />
    </NextIntlClientProvider>
  );
}
