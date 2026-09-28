"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useDownload } from "@/hooks/use-download";
import { toast } from "@/lib/toast";
import { exportRoute, type SharedFileKind } from "@/lib/shared-file";

/**
 * Downloads a setlist, gig or tour as a file someone else can import
 * (the server names it after the item). `exporting` is true meanwhile.
 */
export function useSharedFileExport(kind: SharedFileKind, id: string) {
  const t = useTranslations("sharedFiles");
  const download = useDownload();
  const [exporting, setExporting] = useState(false);

  const exportFile = useCallback(async () => {
    setExporting(true);
    try {
      const saved = await download(
        exportRoute(kind, id),
        `${kind}.setlyst.json`,
      );
      if (saved) toast.success(t(`exported.${kind}`));
    } finally {
      setExporting(false);
    }
  }, [download, kind, id, t]);

  return { exporting, exportFile };
}
