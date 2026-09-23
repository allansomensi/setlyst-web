"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Download, Share2, ChartSpline, Pencil } from "lucide-react";
import type { Setlist } from "@/types/api";
import { PinButton } from "@/components/content/pin-button";
import { SetlistDialog } from "../../_components/setlists-dialog";
import { Link } from "@/components/nav-link";
import { ExportPdfDialog } from "./export-pdf-dialog";
import { ShareSetlistDialog } from "./share-setlist-dialog";
import { useTranslations } from "next-intl";

interface SetlistActionsProps {
  setlist: Setlist;
  /** May edit the setlist (links, description, title). */
  canEdit: boolean;
  /** May export it to PDF (band setlists need the band's `export_pdf`). */
  canExport?: boolean;
  setlistId: string;
  setlistTitle: string;
  shareToken: string | null;
  shareLock?: { reason: string | null } | null;
}

/**
 * The setlist's primary actions, all visible.
 *
 * Analytics, share and export used to hide behind a "⋮" menu — which
 * buried the tempo chart, one of the most useful views in the app, where
 * nobody looked for it. On phones the secondary actions collapse to
 * icon buttons (with accessible names) so the row still fits one line.
 */
export function SetlistActions({
  setlist,
  canEdit,
  canExport = true,
  setlistId,
  setlistTitle,
  shareToken,
  shareLock,
}: SetlistActionsProps) {
  const t = useTranslations("setlists");
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button asChild size="lg" className="h-10 gap-2 px-4">
        <Link href={`/dashboard/setlists/${setlistId}/live`}>
          <Play className="h-4 w-4" />
          {t("liveModeBtn")}
        </Link>
      </Button>

      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-10 gap-2 px-3"
        title={t("analyticsBtn")}
      >
        <Link href={`/dashboard/setlists/${setlistId}/analytics`}>
          <ChartSpline className="text-primary h-4 w-4" />
          <span className="sr-only sm:not-sr-only">{t("analyticsBtn")}</span>
        </Link>
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="h-10 gap-2 px-3"
        onClick={() => setIsShareDialogOpen(true)}
        title={t("shareBtn")}
      >
        <Share2 className="h-4 w-4" />
        <span className="sr-only lg:not-sr-only">{t("shareBtn")}</span>
      </Button>

      {canExport && (
        <Button
          variant="outline"
          size="lg"
          className="h-10 gap-2 px-3"
          onClick={() => setIsPdfDialogOpen(true)}
          title={t("exportPdf.title")}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only lg:not-sr-only">{t("exportBtn")}</span>
        </Button>
      )}

      {canEdit && (
        <Button
          variant="outline"
          size="lg"
          className="h-10 gap-2 px-3"
          onClick={() => setIsEditOpen(true)}
          title={t("editBtn")}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          <span className="sr-only lg:not-sr-only">{t("editBtn")}</span>
        </Button>
      )}

      <PinButton
        type="setlist"
        id={setlistId}
        name={setlistTitle}
        pinned={!!setlist.is_pinned}
        variant="default"
        className="h-10"
      />

      <SetlistDialog
        setlist={setlist}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        bandId={setlist.band_id ?? undefined}
      />

      <ExportPdfDialog
        setlistId={setlistId}
        setlistTitle={setlistTitle}
        isOpen={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
      />

      <ShareSetlistDialog
        setlistId={setlistId}
        shareToken={shareToken}
        shareLock={shareLock}
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  );
}
