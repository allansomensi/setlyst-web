"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { describeApiError } from "@/lib/api-errors";
import { toastActionError } from "@/lib/action-toast";
import { DownloadError, downloadFile } from "@/lib/download";

/**
 * `downloadFile` with the app's error handling: every failure becomes a
 * translated toast (an expired session signs out, a busy server says when
 * to retry). Resolves to the saved file name, or null on failure.
 */
export function useDownload() {
  const t = useTranslations("downloads");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale();

  return useCallback(
    async (
      url: string,
      fallbackName: string,
      init?: RequestInit,
    ): Promise<string | null> => {
      try {
        return await downloadFile(url, fallbackName, init);
      } catch (error) {
        if (!(error instanceof DownloadError)) {
          toast.error(t("failed"));
          return null;
        }

        const translated = describeApiError(
          error.code,
          error.meta,
          (key, values) => tApi(key, values),
          locale,
        );

        switch (error.kind) {
          case "unauthorized":
            toastActionError(
              { code: "session_revoked" },
              translated ?? tApi("SESSION_REVOKED"),
            );
            break;
          case "rate_limited":
            toastActionError(
              {
                code: "rate_limited",
                retryAfterSeconds: error.retryAfterSeconds ?? undefined,
              },
              error.retryAfterSeconds
                ? t("rateLimitedWait", { seconds: error.retryAfterSeconds })
                : t("rateLimited"),
            );
            break;
          case "network":
            toast.error(t("network"));
            break;
          default:
            toast.error(translated ?? t(error.kind));
        }
        return null;
      }
    },
    [t, tApi, locale],
  );
}
