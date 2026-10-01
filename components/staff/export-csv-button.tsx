"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useDownload } from "@/hooks/use-download";
import { adminExportHref, type AdminExportKind } from "@/lib/console";
import { toast } from "@/lib/toast";

/**
 * "Export CSV" for a staff listing (admin only): downloads what the list
 * shows, with its current filters (`query`, the list's API query; paging
 * is ignored), through `/api/export/admin/{kind}`. The export itself is
 * recorded in the audit log by the API.
 */
export function ExportCsvButton({
  kind,
  query,
}: {
  kind: AdminExportKind;
  query: string;
}) {
  const t = useTranslations("console.export");
  const download = useDownload();
  const [exporting, setExporting] = useState(false);

  const run = async () => {
    setExporting(true);
    try {
      const saved = await download(
        adminExportHref(kind, query),
        `setlyst-${kind}.csv`,
      );
      if (saved) toast.success(t("done", { file: saved }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={exporting}
      aria-busy={exporting}
      title={t("hint")}
    >
      {exporting ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Download aria-hidden />
      )}
      {t("button")}
    </Button>
  );
}
