"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { ThemeProvider } from "@/components/providers/theme_provider";
import { Toaster } from "@/components/ui/toaster";

interface PublicShellProps {
  locale: string;
  messages: AbstractIntlMessages;
  /** CSP nonce for next-themes' inline script (lib/server/nonce.ts). */
  nonce?: string;
  children: ReactNode;
}

/**
 * Providers for the public share pages. They sit outside the `[locale]`
 * layout, so they get none of its providers: without this they rendered
 * in English only, always in light mode (nothing ever set the `dark`
 * class), and had nowhere to show a toast.
 *
 * The theme here is the visitor's own choice (or their system's), stored
 * by next-themes on their device — there's no account to read it from.
 */
export function PublicShell({
  locale,
  messages,
  nonce,
  children,
}: PublicShellProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        nonce={nonce}
      >
        {/* The document's own `lang` comes from the root layout, which
            can't see this page's locale; this keeps screen readers and
            hyphenation right for the content itself. */}
        <div lang={locale} className="contents">
          {children}
        </div>
        <Toaster position="top-center" />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
