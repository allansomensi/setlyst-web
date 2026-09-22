"use client";

import { useSession } from "next-auth/react";
import { ExportPdfDialog as SharedExportPdfDialog } from "@/components/setlists/export-pdf-dialog";

interface ExportPdfDialogProps {
  setlistId: string;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

/** The dashboard's PDF export: the shared dialog, authenticated. */
export function ExportPdfDialog({
  setlistId,
  setlistTitle,
  isOpen,
  onClose,
}: ExportPdfDialogProps) {
  const { data: session } = useSession();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

  return (
    <SharedExportPdfDialog
      endpoint={`${baseUrl}/setlists/${encodeURIComponent(setlistId)}/export/pdf`}
      authToken={session?.user?.apiToken}
      setlistTitle={setlistTitle}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
