"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Gig, Setlist } from "@/types/api";
import { deleteGig } from "../../actions";
import { GigDialog, BandOption } from "../../_components/gigs-dialog";
import { ShareGigDialog } from "./share-gig-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Share2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GigActionsProps {
  gig: Gig;
  canManage: boolean;
  personalSetlists: Setlist[];
  bands: BandOption[];
}

export function GigActions({
  gig,
  canManage,
  personalSetlists,
  bands,
}: GigActionsProps) {
  const router = useRouter();
  const t = useTranslations("gigs");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteGig(gig.id, gig.band_id ?? undefined);
      if (result.success) {
        toast.success(t("dialog.deleted"));
        router.push("/dashboard/gigs");
      } else {
        toast.error(result.error);
        setIsDeleteOpen(false);
      }
    });
  };

  if (!canManage) {
    return (
      <Button
        variant="outline"
        size="lg"
        className="gap-2"
        onClick={() => setIsShareOpen(true)}
      >
        <Share2 className="h-4 w-4" />
        {t("shareBtn")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="lg"
        className="gap-2"
        onClick={() => setIsShareOpen(true)}
      >
        <Share2 className="h-4 w-4" />
        {t("shareBtn")}
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="gap-2"
        onClick={() => setIsEditOpen(true)}
      >
        <Pencil className="h-4 w-4" />
        {tCommon("edit")}
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="text-red-600 hover:text-red-600"
        onClick={() => setIsDeleteOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <GigDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        gig={gig}
        personalSetlists={personalSetlists}
        bands={bands}
        fixedBandId={gig.band_id ?? undefined}
      />

      <ShareGigDialog
        gigId={gig.id}
        shareToken={gig.share_token}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("delete")}</DialogTitle>
            <DialogDescription>{t("dialog.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
