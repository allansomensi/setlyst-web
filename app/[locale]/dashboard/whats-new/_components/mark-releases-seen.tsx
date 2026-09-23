"use client";

import { useEffect } from "react";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import { LATEST_RELEASE_ID } from "@/lib/whats-new";

/** Opening the page clears the "new" dot on every device. */
export function MarkReleasesSeen() {
  const { settings, update } = useUiSettings();
  const lastSeen = settings.whatsNew.lastSeen;

  useEffect(() => {
    if (LATEST_RELEASE_ID && lastSeen !== LATEST_RELEASE_ID) {
      void update({ whatsNew: { lastSeen: LATEST_RELEASE_ID } });
    }
  }, [lastSeen, update]);

  return null;
}
