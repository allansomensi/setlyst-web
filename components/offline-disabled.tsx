"use client";

import { useTranslations } from "next-intl";
import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Props to spread onto a control that writes something — creating,
 * editing, deleting. Offline they come back disabled, with a tooltip that
 * says why.
 *
 * Reading is fully available offline (everything is mirrored on the device
 * — see lib/offline/sync.ts); writing genuinely isn't, since it has to
 * reach the API. The honest thing is to show that up front. The
 * alternative — leaving the button live so it opens a dialog, accepts
 * input, and only then fails on submit — wastes the person's effort and
 * reads as the app being broken rather than as a connection being absent.
 *
 * Usage: `<Button {...offlineDisabled}>` — nothing changes online, where
 * both fields come back undefined.
 */
export function useOfflineDisabled(): {
  disabled?: boolean;
  title?: string;
} {
  const isOnline = useOnlineStatus();
  const t = useTranslations("offlineSync");

  if (isOnline) return {};
  return { disabled: true, title: t("actionNeedsConnection") };
}
