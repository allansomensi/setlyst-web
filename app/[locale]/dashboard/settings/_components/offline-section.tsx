"use client";

import {
  CalendarDays,
  CloudDownload,
  Loader2,
  ListMusic,
  Music,
  Users,
  WifiOff,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslations, useFormatter } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/components/providers/offline-sync-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncErrorText } from "@/hooks/use-sync-error-text";
import { InstallApp } from "../../_components/install-app";

/**
 * One-button "make sure everything is available offline" control for the
 * settings page. `OfflineSyncProvider` already syncs in the background,
 * but that's opportunistic and silent — this gives the user something to
 * press before heading out to a gig with spotty signal, with a plain
 * before/after ("Saving..." → "N setlists, M songs available offline") so
 * they can actually confirm it worked instead of just hoping it did.
 */
export function OfflineSection() {
  const t = useTranslations("offlineSync");
  const format = useFormatter();
  const isOnline = useOnlineStatus();
  const {
    status,
    progress,
    lastSyncedAt,
    lastError,
    syncNow,
    cachedSetlistCount,
    cachedSongCount,
    cachedGigCount,
    cachedBandCount,
  } = useOfflineSync();

  const isSyncing = status === "syncing";
  const hasFailed = status === "error";
  const errorText = useSyncErrorText(lastError);
  const tInstall = useTranslations("installApp");
  const totalCached =
    cachedSetlistCount + cachedSongCount + cachedGigCount + cachedBandCount;

  // A full download is several distinct stages and can take a while on a
  // big library, so say which one is running rather than leaving a spinner
  // to imply something might be stuck. Only the per-setlist stage has a
  // meaningful count to show against.
  const progressLabel = !isSyncing
    ? null
    : progress.phase === "setlists" && progress.total > 0
      ? t("progressSetlists", {
          completed: progress.completed,
          total: progress.total,
        })
      : progress.phase === "pages"
        ? t("progressPages")
        : t("progressLibrary");

  const progressPercent =
    isSyncing && progress.phase === "setlists" && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudDownload className="text-primary h-4 w-4" />
          {t("downloadTitle")}
        </CardTitle>
        <CardDescription>{t("downloadDescription")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ListMusic className="h-4 w-4" />
              {t("downloadSetlistsCount", { count: cachedSetlistCount })}
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Music className="h-4 w-4" />
              {t("downloadSongsCount", { count: cachedSongCount })}
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {t("downloadGigsCount", { count: cachedGigCount })}
            </span>
            {cachedBandCount > 0 && (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {t("downloadBandsCount", { count: cachedBandCount })}
              </span>
            )}
          </div>

          <Button
            type="button"
            onClick={syncNow}
            disabled={isSyncing || !isOnline}
            className="gap-2 sm:w-auto"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="h-4 w-4" />
            )}
            {isSyncing ? t("syncing") : t("downloadBtn")}
          </Button>
        </div>

        {isSyncing && progressLabel && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">{progressLabel}</p>
            {progressPercent !== null && (
              <Progress value={progressPercent} className="h-1.5" />
            )}
          </div>
        )}

        {!isOnline && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            {t("downloadOfflineHint")}
          </p>
        )}

        {isOnline && hasFailed && (
          <p
            role="status"
            className="text-destructive text-xs dark:text-red-400"
          >
            <span className="font-medium">{t("syncFailed")}</span>
            {errorText && <> · {errorText}</>}
          </p>
        )}

        {isOnline && !hasFailed && !isSyncing && lastSyncedAt && (
          <p className="text-muted-foreground text-xs">
            {t("downloadSummary", {
              total: totalCached,
              time: format.relativeTime(new Date(lastSyncedAt), new Date()),
            })}
          </p>
        )}

        {isOnline && !hasFailed && !isSyncing && !lastSyncedAt && (
          <p className="text-muted-foreground text-xs">
            {t("downloadNeverSynced")}
          </p>
        )}

        {/* The installed app opens full screen and is what keeps working
            with no signal, so this is where it is offered. */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{tInstall("title")}</p>
          <InstallApp />
        </div>
      </CardContent>
    </Card>
  );
}
