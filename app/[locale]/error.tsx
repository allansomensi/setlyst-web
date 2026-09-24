"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { useAppRouter } from "@/hooks/use-app-router";

/**
 * Crash screen for everything under a locale outside the dashboard (which
 * has its own): the public site, sign-in and sign-up.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  const tNotFound = useTranslations("notFound");

  const router = useAppRouter();
  const [isRetrying, startRetry] = useTransition();

  // `reset()` alone only re-renders the client tree; when the failure came
  // from server data, that just throws again. Refreshing first refetches
  // the server components, and the transition keeps the button pending
  // until the new payload is in.
  const retry = () =>
    startRetry(() => {
      router.refresh();
      reset();
    });

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[LocaleError]", error);
    }
  }, [error]);

  return (
    <main
      data-error-boundary="site"
      className="bg-background flex min-h-dvh flex-col items-center justify-center gap-5 px-4 py-16 text-center"
    >
      <div className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive size-6" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("production")}</p>
        {error.digest && (
          <p className="text-muted-foreground text-xs">
            {t("reference")} <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={retry} disabled={isRetrying} aria-busy={isRetrying}>
          {isRetrying && <Loader2 className="animate-spin" aria-hidden />}
          {t("tryAgain")}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">{tNotFound("home")}</Link>
        </Button>
      </div>
    </main>
  );
}
