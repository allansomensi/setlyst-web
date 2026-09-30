"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useTranslations } from "next-intl";
import { Gig, Setlist } from "@/types/api";
import { deleteGig } from "../../actions";
import {
  GigDialog,
  BandOption,
  TourOption,
} from "../../_components/gigs-dialog";
import { ShareGigDialog } from "./share-gig-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import {
  CalendarPlus,
  FileJson,
  Loader2,
  Pencil,
  Share2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useSharedFileExport } from "@/hooks/use-shared-file-export";
import { gigToIcs } from "@/lib/ics";
import { sanitizeFilename, saveBlob } from "@/lib/download";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { useOfflineDisabled } from "@/components/offline-disabled";

interface GigActionsProps {
  gig: Gig;
  canManage: boolean;
  personalSetlists: Setlist[];
  bands: BandOption[];
  /** Same-scope tours, for the tour select. */
  tours?: TourOption[];
}

export function GigActions({
  gig,
  canManage,
  personalSetlists,
  bands,
  tours = [],
  pin,
}: GigActionsProps & {
  /** The pin button, placed between Edit and the "more" menu, which stays last. */
  pin?: ReactNode;
}) {
  const router = useAppRouter();
  const t = useTranslations("gigs");
  const tCommon = useTranslations("common");
  const tTrash = useTranslations("trash");
  const tFiles = useTranslations("sharedFiles");
  // Sharing, exporting, editing and deleting all need the API; "Add to
  // calendar" is built on the device and stays available offline.
  const offlineDisabled = useOfflineDisabled();
  // The gig with its setlist and songs, for someone else to import.
  const { exporting, exportFile } = useSharedFileExport("gig", gig.id);

  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  // Bumped on every open so the dialog starts from the saved gig.
  const [editSession, setEditSession] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteGig(gig.id, gig.band_id ?? undefined);
      if (result.success) {
        toastMovedToTrash(
          "gig",
          gig.id,
          {
            message: t("dialog.deleted"),
            undoLabel: tTrash("undo"),
            restoring: tTrash("restoring"),
            restored: t("dialog.restored"),
            restoreFailed: tTrash("restoreFailed"),
          },
          () => router.push(`/dashboard/gigs/${gig.id}`),
        );
        router.push("/dashboard/gigs");
      } else {
        // The dialog stays open so the person can retry or cancel.
        toastActionError(result, result.error);
      }
    });
  };

  /**
   * "Add to calendar": an .ics file the phone or computer opens in its
   * calendar app, at the venue's wall-clock time.
   */
  const addToCalendar = () => {
    const ics = gigToIcs(gig, {
      url: `${window.location.origin}${window.location.pathname}`,
    });
    if (!ics) {
      toast.error(t("calendarFailed"));
      return;
    }
    saveBlob(
      new Blob([ics], { type: "text/calendar;charset=utf-8" }),
      `${sanitizeFilename(gig.venue) || "gig"}.ics`,
    );
  };

  if (!canManage) {
    return (
      <>
        <Button
          variant="outline"
          size="lg"
          className="h-10 gap-2 px-3"
          onClick={addToCalendar}
          title={t("addToCalendar")}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("addToCalendar")}</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-10 gap-2 px-3"
          onClick={() => setIsShareOpen(true)}
          {...offlineDisabled}
          title={offlineDisabled.title ?? t("shareBtn")}
        >
          <Share2 className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("shareBtn")}</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-10 gap-2 px-3"
          onClick={() => void exportFile()}
          disabled={exporting || offlineDisabled.disabled}
          title={offlineDisabled.title ?? tFiles("exportHint.gig")}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileJson className="h-4 w-4" aria-hidden />
          )}
          <span className="sr-only sm:not-sr-only">{tFiles("exportFile")}</span>
        </Button>
        {pin}
        <ShareGigDialog
          gigId={gig.id}
          shareToken={gig.share_token}
          shareLock={
            gig.share_locked_at
              ? { reason: gig.share_lock_reason ?? null }
              : null
          }
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
        />
      </>
    );
  }

  const openEdit = () => {
    setEditSession((n) => n + 1);
    setIsEditOpen(true);
  };

  return (
    <>
      {/* Changing the time, the setlist or the status is what a show's
          page is mostly opened for: a button, not a menu item. */}
      <Button
        variant="outline"
        size="lg"
        className="h-10 gap-2 px-3"
        onClick={openEdit}
        {...offlineDisabled}
        title={offlineDisabled.title ?? tCommon("edit")}
      >
        <Pencil className="h-4 w-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{tCommon("edit")}</span>
      </Button>
      {pin}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="h-10 px-3"
            title={tCommon("moreActions")}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
            <span className="sr-only">{tCommon("moreActions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem
            onClick={() => setIsShareOpen(true)}
            disabled={offlineDisabled.disabled}
          >
            <Share2 className="mr-2 h-4 w-4" />
            {t("shareBtn")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={addToCalendar}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t("addToCalendar")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="items-start"
            onClick={() => void exportFile()}
            disabled={exporting || offlineDisabled.disabled}
          >
            <FileJson className="mt-0.5 mr-2 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block">{tFiles("exportFile")}</span>
              <span className="text-muted-foreground block text-xs">
                {tFiles("exportHint.gig")}
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            variant="destructive"
            disabled={offlineDisabled.disabled}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {tCommon("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GigDialog
        key={`${gig.id}:${editSession}`}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        gig={gig}
        personalSetlists={personalSetlists}
        bands={bands}
        fixedBandId={gig.band_id ?? undefined}
        tours={tours}
      />

      <ShareGigDialog
        gigId={gig.id}
        shareToken={gig.share_token}
        shareLock={
          gig.share_locked_at ? { reason: gig.share_lock_reason ?? null } : null
        }
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      <ConfirmActionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("dialog.deleteTitle")}
        description={t("dialog.deleteConfirm")}
        confirmLabel={tCommon("delete")}
        onConfirm={confirmDelete}
        pending={isPending}
      />
    </>
  );
}
