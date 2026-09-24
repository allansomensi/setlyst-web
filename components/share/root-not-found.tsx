"use client";

import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";

/** The translated 404 body used outside the `[locale]` segment. */
export function RootNotFoundContent() {
  const t = useTranslations("notFound");
  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <AppLogo size={48} className="rounded-xl" />
      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
        <Compass className="size-6" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <p className="text-muted-foreground font-mono text-sm">404</p>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {/* Locale-less on purpose: the middleware picks the visitor's. */}
        <Button asChild>
          <NextLink href="/dashboard">{t("dashboard")}</NextLink>
        </Button>
        <Button variant="outline" asChild>
          <NextLink href="/">{t("home")}</NextLink>
        </Button>
      </div>
    </main>
  );
}
