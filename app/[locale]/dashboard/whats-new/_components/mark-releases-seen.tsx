"use client";

import { useEffect } from "react";
import { useUiSettings } from "@/components/providers/ui-settings-provider";

/** Opening the page clears the "new" dot on every device. */
export function MarkReleasesSeen({ latestId }: { latestId: string | null }) {
  const { settings, update } = useUiSettings();
  const lastSeen = settings.whatsNew.lastSeen;

  useEffect(() => {
    if (latestId && lastSeen !== latestId) {
      void update({ whatsNew: { lastSeen: latestId } });
    }
  }, [latestId, lastSeen, update]);

  return null;
}
