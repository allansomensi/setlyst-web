"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Download, Share2, ChartSpline } from "lucide-react";
import { Link } from "@/components/nav-link";
import { ExportPdfDialog } from "./export-pdf-dialog";
import { ShareSetlistDialog } from "./share-setlist-dialog";
import { useTranslations } from "next-intl";

interface SetlistActionsProps {
  setlistId: string;
  setlistTitle: string;
  shareToken: string | null;
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
  setlistId,
  setlistTitle,
  shareToken,
}: SetlistActionsProps) {
  const t = useTranslations("setlists");
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

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
