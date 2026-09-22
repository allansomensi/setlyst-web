"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Download, Share2, BarChart3, MoreVertical } from "lucide-react";
import Link from "next/link";
import { ExportPdfDialog } from "./export-pdf-dialog";
import { ShareSetlistDialog } from "./share-setlist-dialog";
import { useTranslations } from "next-intl";

interface SetlistActionsProps {
  setlistId: string;
  setlistTitle: string;
  shareToken: string | null;
}

export function SetlistActions({
  setlistId,
  setlistTitle,
  shareToken,
}: SetlistActionsProps) {
  const t = useTranslations("setlists");
  const tCommon = useTranslations("common");
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button asChild size="lg" className="gap-2">
        <Link href={`/dashboard/setlists/${setlistId}/live`}>
          <Play className="h-4 w-4" />
          {t("liveModeBtn")}
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" className="px-3">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{tCommon("moreActions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            {t("shareBtn")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsPdfDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            {t("exportBtn")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/setlists/${setlistId}/analytics`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              {t("analyticsBtn")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
