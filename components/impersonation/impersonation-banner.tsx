"use client";

import { Eye, Loader2, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "./use-impersonation";

/**
 * Always-visible strip while a staff member views the platform as someone
 * else, so it's impossible to forget whose account is on screen — and one
 * click away from switching back.
 */
export function ImpersonationBanner() {
  const t = useTranslations("impersonation");
  const { isImpersonating, impersonator, viewedUsername, isSwitching, stop } =
    useImpersonation();

  if (!isImpersonating) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-2 border-b border-amber-500/40 bg-amber-400/15 px-4 py-2 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:text-amber-100"
    >
      <p className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          {t.rich("banner", {
            username: viewedUsername,
            staff: impersonator?.name ?? "",
            strong: (chunks) => (
              <strong className="font-semibold">{chunks}</strong>
            ),
          })}
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0 border-amber-600/40 bg-transparent hover:bg-amber-500/20"
        onClick={stop}
        disabled={isSwitching}
      >
        {isSwitching ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="mr-2 h-4 w-4" />
        )}
        {t("stop")}
      </Button>
    </div>
  );
}
