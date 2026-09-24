"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useOfflineSync } from "@/components/providers/offline-sync-provider";
import { cn } from "@/lib/utils";
import { useSyncErrorText } from "@/hooks/use-sync-error-text";

/**
 * Whether this setlist would work with no signal — shown next to the total
 * duration under the title.
 *
 * It used to sit in the action bar, squeezed between two large buttons as
 * a smaller pill that lined up with neither. It isn't an action, though:
 * it's a fact about the setlist, like its duration, so it now lives with
 * the other facts and takes exactly their shape. Clicking it still syncs
 * right away, for the moment before a show when you want to be sure.
 */
export function SetlistOfflineStatus({ setlistId }: { setlistId: string }) {
  const tOffline = useTranslations("offlineSync");
  const format = useFormatter();

  const { status, lastSyncedAt, lastError, syncNow, isSetlistCached } =
    useOfflineSync();
  const isSyncing = status === "syncing";
  const isSynced = isSetlistCached(setlistId);
  const hasFailed = status === "error" && !isSynced;
  const errorText = useSyncErrorText(lastError);

  const label = isSyncing
    ? tOffline("syncing")
    : isSynced
      ? tOffline("synced")
      : hasFailed
        ? tOffline("syncFailed")
        : tOffline("notSynced");

  const detail =
    isSynced && lastSyncedAt
      ? tOffline("syncedAt", {
          time: format.relativeTime(new Date(lastSyncedAt), new Date()),
        })
      : hasFailed && errorText
        ? `${label}: ${errorText}`
        : label;

  const Icon = isSyncing ? RefreshCw : hasFailed ? CloudOff : Cloud;

  return (
    <button
      type="button"
      onClick={syncNow}
      disabled={isSyncing}
      title={detail}
      aria-label={`${detail}. ${tOffline("syncNow")}`}
      className={cn(
        // Same box as the duration pill beside it.
        "flex w-fit max-w-full min-w-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-left text-sm font-medium transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default",
        isSynced
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
          : hasFailed
            ? "border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-400"
            : "bg-muted/50 text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isSyncing && "animate-spin")} />
      {/* One line, like the pill beside it; the full text is in the
          tooltip if a narrow phone has to cut it. */}
      <span className="truncate">{label}</span>
    </button>
  );
}
