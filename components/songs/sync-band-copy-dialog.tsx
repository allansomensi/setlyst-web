"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { syncBandSong } from "@/app/[locale]/dashboard/songs/actions";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import type { BandCopyStatus } from "@/types/api";

interface SyncBandCopyDialogProps {
  /** The band copy to update; the dialog is open while set. */
  copy: BandCopyStatus | null;
  /** The song's title, for the texts. */
  title: string;
  onClose: () => void;
  onSynced?: (copy: BandCopyStatus) => void;
}

/**
 * Confirms replacing a band's copy of a song with the person's current
 * version of it. When the band edited its copy, says plainly that those
 * edits are replaced.
 */
export function SyncBandCopyDialog({
  copy,
  title,
  onClose,
  onSynced,
}: SyncBandCopyDialogProps) {
  const t = useTranslations("bandCopies");
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    if (!copy) return;
    startTransition(async () => {
      const result = await syncBandSong(copy.song_id);
      if (!result.success) {
        toastActionError(result, result.error || t("syncFailed"));
        return;
      }
      toast.success(t("synced", { title, band: copy.band_name }));
      onSynced?.(result.data ?? copy);
      onClose();
    });
  };

  return (
    <ConfirmActionDialog
      open={!!copy}
      onOpenChange={(open) => !open && onClose()}
      title={t("syncTitle")}
      description={t("syncDescription", {
        title,
        band: copy?.band_name ?? "",
      })}
      confirmLabel={t("syncAction")}
      onConfirm={confirm}
      pending={isPending}
      destructive={false}
    >
      {copy?.band_edited && (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <TriangleAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          {t("bandEditedWarning")}
        </p>
      )}
    </ConfirmActionDialog>
  );
}
