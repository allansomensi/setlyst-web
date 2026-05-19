"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Download, FileText } from "lucide-react";
import Link from "next/link";
import { ExportPdfDialog } from "./export-pdf-dialog";
import { useTranslations } from "next-intl";

interface SetlistActionsProps {
  setlistId: string;
  setlistTitle: string;
}

export function SetlistActions({
  setlistId,
  setlistTitle,
}: SetlistActionsProps) {
  const t = useTranslations("setlists");
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" className="gap-2">
            <Download className="h-4 w-4" />
            {t("exportBtn")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsPdfDialogOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            {t("exportPdfOption")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button asChild size="lg" variant="outline" className="gap-2">
        <Link href={`/dashboard/setlists/${setlistId}/live`}>
          <Play className="h-5 w-5" /> {t("liveModeBtn")}
        </Link>
      </Button>

      <ExportPdfDialog
        setlistId={setlistId}
        setlistTitle={setlistTitle}
        isOpen={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
      />
    </div>
  );
}
