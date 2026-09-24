"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOfflineCache } from "@/components/providers/offline-sync-provider";

/**
 * A thin, always-in-flow banner across the top of the dashboard that
 * appears the moment the browser goes offline. Live Mode already shows a
 * small "Offline" badge, but that only reassures you once you're already
 * on stage looking at a song — everywhere else in the app (browsing
 * setlists, checking a show) gave no sign at all that anything was saved.
 * This says so explicitly, with a real count from the local database
 * rather than a generic "you're offline" warning.
 */
export function OfflineStatusBanner() {
  const isOnline = useOnlineStatus();
  const t = useTranslations("offlineSync");
  const { cachedSetlistCount, cachedSongCount } = useOfflineCache();

  if (isOnline) return null;

  const totalCached = cachedSetlistCount + cachedSongCount;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-600 md:px-8 dark:text-amber-400">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="font-medium">{t("offlineBannerTitle")}</span>
      <span className="text-amber-600/80 dark:text-amber-400/80">
        {totalCached > 0
          ? // Sets the expectation for the whole session up front: this is
            // a readable app right now, not a broken one — and the reason
            // an edit button won't work isn't a bug.
            t("readOnlyNotice")
          : t("offlineBannerEmpty")}
      </span>
    </div>
  );
}
