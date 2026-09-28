"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Download,
  Share2,
  ChartSpline,
  Pencil,
  FileText,
  FileJson,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSharedFileExport } from "@/hooks/use-shared-file-export";
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
  /**
   * May manage its public link: not a collaborator on someone else's
   * setlist (the link is the owner's alone).
   */
  canShare?: boolean;
  /** May export it to PDF (band setlists need the band's `export_pdf`). */
  canExport?: boolean;
  /** The plan includes PDF export (`pdf_export`); without it, watermarked. */
  pdfInPlan?: boolean;
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
  canShare = true,
  canExport = true,
  pdfInPlan = true,
  setlistId,
  setlistTitle,
  shareToken,
  shareLock,
}: SetlistActionsProps) {
  const t = useTranslations("setlists");
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  // The setlist with its songs and artists, for someone else to import.
  const { exporting: isExportingFile, exportFile } = useSharedFileExport(
    "setlist",
    setlistId,
  );

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {/* Icon-only on phones, so every action fits one row. */}
      <Button
        asChild
        size="lg"
        className="h-10 gap-2 px-3 sm:px-4"
        title={t("liveModeBtn")}
      >
        <Link href={`/dashboard/setlists/${setlistId}/live`}>
          <Play className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("liveModeBtn")}</span>
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

      {canShare && (
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
      )}

      {canExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="h-10 gap-2 px-3"
              title={t("exportBtn")}
              disabled={isExportingFile}
            >
              {isExportingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              <span className="sr-only lg:not-sr-only">{t("exportBtn")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              onSelect={() => setIsPdfDialogOpen(true)}
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block font-medium">{t("exportMenu.pdf")}</span>
                <span className="text-muted-foreground block text-xs">
                  {t("exportMenu.pdfHint")}
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              onSelect={() => void exportFile()}
            >
              <FileJson className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block font-medium">
                  {t("exportMenu.file")}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {t("exportMenu.fileHint")}
                </span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        watermarkOnly={!pdfInPlan}
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
