"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[DashboardError]", error);
    }
  }, [error]);

  const userMessage =
    process.env.NODE_ENV === "production"
      ? t("production")
      : error.message || t("production");

  const digest =
    process.env.NODE_ENV === "production" ? error.digest : undefined;

  return (
    // data-error-boundary is a stable, locale-independent marker the
    // service worker scans for (see isUsableForCache() in public/sw.js)
    // before caching a page for offline use. React Server Components can
    // still stream an HTTP 200 for a document whose nested data fetch
    // threw after the outer shell already flushed — status alone can't
    // tell a real page from this fallback, so don't remove this attribute
    // without updating the service worker to match.
    <div
      data-error-boundary="dashboard"
      className="animate-in fade-in-50 flex h-[50vh] w-full flex-col items-center justify-center space-y-4 rounded-md border border-dashed p-8 text-center"
    >
      <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
      <p className="text-muted-foreground max-w-sm">{userMessage}</p>
      {digest && (
        <p className="text-muted-foreground text-xs">
          {t("reference")} <code className="font-mono">{digest}</code>
        </p>
      )}
      <Button variant="outline" onClick={() => reset()}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
