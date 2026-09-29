"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CloudOff, LinkIcon, Loader2, RotateCw } from "lucide-react";
import NextLink from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";

/**
 * What a shared setlist or gig link shows when it can't show the content:
 *
 * - `gone` (404): the link was turned off, replaced, or never existed.
 *   Says so plainly and what to do (ask for a new one), so a bandmate
 *   doesn't keep retrying a dead link.
 * - `unavailable` (server error, outage): *not* the link's fault. Said
 *   explicitly, with a retry, so nobody concludes the link was revoked.
 */
export function PublicLinkStatus({
  kind,
  resource,
  onRetry,
  digest,
}: {
  kind: "gone" | "unavailable";
  resource: "setlist" | "gig";
  onRetry?: () => void;
  digest?: string;
}) {
  const t = useTranslations("publicPage.status");
  const Icon = kind === "gone" ? LinkIcon : CloudOff;
  // Next's `retry` refetches in a transition and keeps this screen up
  // until the answer arrives; wrapped in ours, the button can show that
  // it's working (and not take a second tap) instead of looking dead.
  const [isRetrying, startRetry] = useTransition();

  return (
    <main
      data-error-boundary={kind === "unavailable" ? "public" : undefined}
      className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-6 px-[max(1rem,env(safe-area-inset-left))] pt-[max(4rem,env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))] text-center"
    >
      <AppLogo size={44} className="rounded-xl" />
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t(`${kind}.title.${resource}`)}
        </h1>
        <p className="text-muted-foreground">{t(`${kind}.description`)}</p>
        {digest && (
          <p className="text-muted-foreground pt-1 text-xs">
            {t("reference")} <code className="font-mono">{digest}</code>
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {kind === "unavailable" && onRetry && (
          <Button
            size="lg"
            onClick={() => startRetry(onRetry)}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RotateCw className="size-4" aria-hidden />
            )}
            {t("retry")}
          </Button>
        )}
        <Button
          size="lg"
          variant={kind === "gone" ? "default" : "outline"}
          asChild
        >
          {/* The public site, outside any locale prefix: the middleware
              sends the visitor to their own language. */}
          <NextLink href="/">{t("about")}</NextLink>
        </Button>
      </div>
    </main>
  );
}

/** error.tsx body for the share routes. */
export function PublicLinkError({
  error,
  retry,
  resource,
}: {
  error: Error & { digest?: string };
  /**
   * Next's `retry` (refetch the server tree, then re-render): `reset`
   * alone re-rendered the same failed server payload, so the button did
   * nothing after an outage.
   */
  retry: () => void;
  resource: "setlist" | "gig";
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[PublicLinkError]", error);
    }
  }, [error]);
  return (
    <PublicLinkStatus
      kind="unavailable"
      resource={resource}
      onRetry={retry}
      digest={process.env.NODE_ENV === "production" ? error.digest : undefined}
    />
  );
}
