"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  initialTheme = "system",
  ...props
}: React.ComponentProps<typeof NextThemesProvider> & {
  initialTheme?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={initialTheme}
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
