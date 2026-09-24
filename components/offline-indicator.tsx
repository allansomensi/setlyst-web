"use client";

import { CloudCheck, CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useOfflineCache } from "@/components/providers/offline-sync-provider";

interface OfflineIndicatorProps {
  kind: "setlist" | "song";
  id: string;
  className?: string;
}

/**
 * A small, always-visible mark of whether a specific setlist or song has
 * an offline copy on this device, right next to its name in a list, so
 * "is this safe to rely on without signal?" doesn't require opening a
 * menu to find out.
 *
 * The state is carried by the shape (a cloud with a check vs. a crossed-out
 * cloud), not by colour alone, and exposed to assistive tech as an image
 * with a name.
 */
export function OfflineIndicator({
  kind,
  id,
  className,
}: OfflineIndicatorProps) {
  const t = useTranslations("offlineSync");
  const { isSetlistCached, isSongCached } = useOfflineCache();
  const isCached = kind === "setlist" ? isSetlistCached(id) : isSongCached(id);
  const label = isCached ? t("synced") : t("notSynced");
  const Icon = isCached ? CloudCheck : CloudOff;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("inline-flex shrink-0", className)}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          isCached
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground/70",
        )}
        aria-hidden
      />
    </span>
  );
}
