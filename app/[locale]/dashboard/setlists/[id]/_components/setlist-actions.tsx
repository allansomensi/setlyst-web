"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Download,
  Share2,
  BarChart3,
  MoreVertical,
  Cloud,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { ExportPdfDialog } from "./export-pdf-dialog";
import { ShareSetlistDialog } from "./share-setlist-dialog";
import { useTranslations, useFormatter } from "next-intl";
import { useOfflineSync } from "@/components/providers/offline-sync-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SetlistActionsProps {
  setlistId: string;
  setlistTitle: string;
  shareToken: string | null;
}

export function SetlistActions({
  setlistId,
  setlistTitle,
  shareToken,
}: SetlistActionsProps) {
  const t = useTranslations("setlists");
  const tCommon = useTranslations("common");
  const tOffline = useTranslations("offlineSync");
  const format = useFormatter();
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const { status, lastSyncedAt, lastError, syncNow, isSetlistCached } =
    useOfflineSync();
  const isSyncing = status === "syncing";
  const isSynced = isSetlistCached(setlistId);
  const hasFailed = status === "error" && !isSynced;

  const offlineLabel = isSyncing
    ? tOffline("syncing")
    : isSynced
      ? tOffline("synced")
      : hasFailed
        ? tOffline("syncFailed")
        : tOffline("notSynced");

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button asChild size="lg" className="gap-2">
        <Link href={`/dashboard/setlists/${setlistId}/live`}>
          <Play className="h-4 w-4" />
          {t("liveModeBtn")}
        </Link>
      </Button>

      {/* Always-visible offline status — no need to open the menu to know
          whether this setlist would actually work with no signal. Doubles
          as a manual "sync now" button. */}
      <button
        type="button"
        onClick={syncNow}
        disabled={isSyncing}
        title={
          isSynced && lastSyncedAt
            ? tOffline("syncedAt", {
                time: format.relativeTime(new Date(lastSyncedAt)),
              })
            : hasFailed && lastError
              ? `${offlineLabel}: ${lastError}`
              : offlineLabel
        }
      >
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5 px-2.5 py-1.5 text-xs font-medium",
            isSynced
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : hasFailed
                ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                : "text-muted-foreground",
          )}
        >
          {isSyncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Cloud className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{offlineLabel}</span>
        </Badge>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" className="px-3">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{tCommon("moreActions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            {t("shareBtn")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsPdfDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            {t("exportBtn")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/setlists/${setlistId}/analytics`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              {t("analyticsBtn")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportPdfDialog
        setlistId={setlistId}
        setlistTitle={setlistTitle}
        isOpen={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
      />

      <ShareSetlistDialog
        setlistId={setlistId}
        shareToken={shareToken}
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  );
}
