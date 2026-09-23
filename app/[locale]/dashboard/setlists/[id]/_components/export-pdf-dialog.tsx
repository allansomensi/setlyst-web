"use client";

import { ExportPdfDialog as SharedExportPdfDialog } from "@/components/setlists/export-pdf-dialog";

interface ExportPdfDialogProps {
  setlistId: string;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
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
}: ExportPdfDialogProps) {
  return (
    <SharedExportPdfDialog
      endpoint={`/api/export/setlists/${encodeURIComponent(setlistId)}/pdf`}
      canSaveDefault
      setlistTitle={setlistTitle}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
