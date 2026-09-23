"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDownload } from "@/hooks/use-download";

/** "Export" menu of the songs page (whole personal library). */
export function SongsExportMenu() {
  const t = useTranslations("songs");
  const download = useDownload();
  const [isExporting, setIsExporting] = useState(false);

  const exportChordpro = async () => {
    setIsExporting(true);
    try {
      const saved = await download(
        "/api/export/songs/chordpro",
        "setlyst-songs.cho",
      );
      if (saved) toast.success(t("exportSuccess"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin sm:mr-2" aria-hidden />
          ) : (
            <Download className="h-4 w-4 sm:mr-2" aria-hidden />
          )}
          <span className="sr-only sm:not-sr-only">{t("export")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={exportChordpro}>
          {t("exportChordpro")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
