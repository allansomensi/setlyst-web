"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";

/**
 * Crash screen for everything under a locale outside the dashboard (which
 * has its own): the public site, sign-in and sign-up.
 */
export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("error");
  const tNotFound = useTranslations("notFound");

  const [isRetrying, startRetry] = useTransition();

  // `retry()` refetches the server tree before re-rendering (a bare
  // `reset()` would just throw again when the failure came from server
  // data); the transition keeps the button pending until the new payload
  // is in.
  const tryAgain = () => startRetry(() => retry());

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[LocaleError]", error);
    }
  }, [error]);

  return (
    // Same frame as the 404 (logo home, soft glow), so a crash still reads
    // as part of Setlyst rather than a bare browser error.
    <main
      data-error-boundary="site"
      className="bg-background relative isolate flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-4 py-16 text-center"
    >
      <div
        aria-hidden
        className="bg-destructive/10 pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-2/3 rounded-full blur-3xl"
      />
      <Link
        href="/"
        aria-label={tNotFound("home")}
        className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
      >
        <AppLogo size={44} decorative className="rounded-xl" />
      </Link>
      <div className="max-w-md space-y-3">
        <div className="bg-destructive/10 mx-auto flex size-14 items-center justify-center rounded-2xl">
          <AlertTriangle className="text-destructive size-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-pretty">{t("production")}</p>
        {error.digest && (
          <p className="text-muted-foreground text-xs">
            {t("reference")} <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          size="lg"
          onClick={tryAgain}
          disabled={isRetrying}
          aria-busy={isRetrying}
        >
          {isRetrying && <Loader2 className="animate-spin" aria-hidden />}
          {t("tryAgain")}
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/">{tNotFound("home")}</Link>
        </Button>
      </div>
    </main>
  );
}
