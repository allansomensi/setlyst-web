"use client";

import { useTranslations } from "next-intl";
import { syncErrorCode } from "@/lib/offline/sync";

/**
 * The offline sync's last error (a code, see SyncErrorCode) as a sentence
 * that says what to do about it, or null when there is none.
 */
export function useSyncErrorText(lastError: string | null): string | null {
  const t = useTranslations("offlineSync.errors");
  const code = syncErrorCode(lastError);
  return code ? t(code) : null;
}
