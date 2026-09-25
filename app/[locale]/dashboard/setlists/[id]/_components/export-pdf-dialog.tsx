"use client";

import { useTranslations } from "next-intl";
import { ExportPdfDialog as SharedExportPdfDialog } from "@/components/setlists/export-pdf-dialog";
import { UpgradeHint } from "@/components/content/upgrade-hint";

interface ExportPdfDialogProps {
  setlistId: string;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
  /** PDF export isn't in the person's plan: always watermarked. */
  watermarkOnly?: boolean;
}

/**
 * The dashboard's PDF export: the shared dialog pointed at the app's own
 * route handler, which adds the API token server-side.
 */
export function ExportPdfDialog({
  setlistId,
  setlistTitle,
  isOpen,
  onClose,
  watermarkOnly = false,
}: ExportPdfDialogProps) {
  const t = useTranslations("setlists.exportPdf");
  return (
    <SharedExportPdfDialog
      endpoint={`/api/export/setlists/${encodeURIComponent(setlistId)}/pdf`}
      canSaveDefault
      forceWatermark={watermarkOnly}
      watermarkNotice={<UpgradeHint message={t("watermarkOnly")} />}
      setlistTitle={setlistTitle}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
