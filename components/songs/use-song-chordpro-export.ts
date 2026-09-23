"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { useDownload } from "@/hooks/use-download";

/** "Exportar ChordPro" for one song (`/api/export/songs/{id}/chordpro`). */
export function useSongChordProExport() {
  const t = useTranslations("songExport.chordpro");
  const download = useDownload();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const exportSong = useCallback(
    async (songId: string, title: string) => {
      setPendingId(songId);
      try {
        const saved = await download(
          `/api/export/songs/${songId}/chordpro`,
          `${title}.cho`,
        );
        if (saved) toast.success(t("success"));
      } finally {
        setPendingId(null);
      }
    },
    [download, t],
  );

  return { exportSong, pendingId };
}
