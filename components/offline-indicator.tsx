"use client";

import { Cloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useOfflineSync } from "@/components/providers/offline-sync-provider";

interface OfflineIndicatorProps {
  kind: "setlist" | "song";
  id: string;
  className?: string;
}

/**
 * A small, always-visible cloud icon marking whether a specific setlist or
 * song currently has an offline copy on this device — lit up (and
 * tooltipped "Available offline") once it's actually in IndexedDB, dim
 * otherwise. Meant to sit right next to the item's name in a list, so
 * "is this safe to rely on without signal?" doesn't require opening a menu
 * to find out.
 */
export function OfflineIndicator({
  kind,
  id,
  className,
}: OfflineIndicatorProps) {
  const t = useTranslations("offlineSync");
  const { isSetlistCached, isSongCached } = useOfflineSync();
  const isCached = kind === "setlist" ? isSetlistCached(id) : isSongCached(id);

  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      title={isCached ? t("synced") : t("notSynced")}
    >
      <Cloud
        className={cn(
          "h-3.5 w-3.5",
          isCached ? "text-emerald-500" : "text-muted-foreground/40",
        )}
        aria-label={isCached ? t("synced") : t("notSynced")}
      />
    </span>
  );
}
