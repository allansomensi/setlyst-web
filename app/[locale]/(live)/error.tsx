"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";

/**
 * Crash screen for Live Mode. Full screen (there is no dashboard around
 * it), with a retry first — a flaky venue connection is the usual cause —
 * and a way back to the dashboard.
 *
 * Carries `data-error-boundary` like every other boundary, so the service
 * worker never caches this fallback as the offline copy of the page (see
 * isUsableForCache() in public/sw.js).
 */
export default function LiveError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  /**
   * Next's `retry`: refetches the server components, then re-renders.
   * `reset` alone re-rendered the same failed server payload, so after a
   * flaky connection it just threw again. See app/global-error.tsx.
   */
  retry: () => void;
}) {
  const t = useTranslations("error");
  const tNotFound = useTranslations("notFound");

  // `retry` runs in a transition of its own; wrapping it in this one keeps
  // the button pending (spinner, disabled) until the new payload is in,
  // instead of looking like the press did nothing on a slow venue network.
  const [isRetrying, startRetry] = useTransition();
  const onRetry = () => startRetry(() => retry());

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[LiveError]", error);
    }
  }, [error]);

  return (
    <main
      data-error-boundary="live"
      className="bg-background flex min-h-dvh flex-col items-center justify-center gap-5 px-[max(1rem,env(safe-area-inset-left))] py-16 text-center"
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
        <Button
          size="lg"
          onClick={onRetry}
          disabled={isRetrying}
          aria-busy={isRetrying}
        >
          {isRetrying && <Loader2 className="animate-spin" aria-hidden />}
          {t("tryAgain")}
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/dashboard">{tNotFound("dashboard")}</Link>
        </Button>
      </div>
    </main>
  );
}
