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
    <div className="animate-in fade-in-50 flex h-[50vh] w-full flex-col items-center justify-center space-y-4 rounded-md border border-dashed p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-6 w-6 text-red-600" />
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
