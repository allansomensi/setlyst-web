"use client";

import { useState, useTransition } from "react";
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
  Pencil,
  Share2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { gigToIcs } from "@/lib/ics";
import { sanitizeFilename, saveBlob } from "@/lib/download";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";

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
}: GigActionsProps) {
  const router = useAppRouter();
  const t = useTranslations("gigs");
  const tCommon = useTranslations("common");
  const tTrash = useTranslations("trash");

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
            restored: t("dialog.restored"),
            restoreFailed: tTrash("restoreFailed"),
          },
          () => router.push(`/dashboard/gigs/${gig.id}`),
        );
        router.push("/dashboard/gigs");
      } else {
        toastActionError(result, result.error);
        setIsDeleteOpen(false);
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
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={addToCalendar}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          {t("addToCalendar")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={() => setIsShareOpen(true)}
        >
          <Share2 className="h-4 w-4" aria-hidden />
          {t("shareBtn")}
        </Button>
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
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" className="px-3">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{tCommon("moreActions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            {t("shareBtn")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={addToCalendar}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t("addToCalendar")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setEditSession((n) => n + 1);
              setIsEditOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {tCommon("edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            variant="destructive"
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
    </div>
  );
}
