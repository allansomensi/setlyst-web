"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { useRouter } from "@/i18n/routing";
import { describeApiError } from "@/lib/api-errors";
import { clearOfflineData } from "@/lib/offline/owner";

/**
 * Starts and stops "view as another user". Starting names the account to
 * the session (`update({ impersonateUserId })`); the server fetches the
 * read-only token itself and keeps it in the encrypted session cookie
 * (lib/auth.ts), so it never reaches this page. Stopping restores the
 * staff member's own session. Both do a full refresh so every server
 * component re-renders with the right identity.
 *
 * Whatever the service worker and the offline mirror stored is dropped on
 * both switches: the staff member's copy must not show up while viewing
 * as someone else, and the viewed account's pages must not stay behind
 * afterwards.
 */
export function useImpersonation() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("impersonation");
  const tErrors = useTranslations("apiErrors");
  const [isSwitching, setIsSwitching] = useState(false);

  const impersonator = session?.user?.impersonator;

  const start = useCallback(
    async (userId: string, username: string) => {
      setIsSwitching(true);
      try {
        const next = await update({ impersonateUserId: userId });
        if (!next?.user?.impersonator) {
          const reason = next?.impersonationError
            ? describeApiError(
                next.impersonationError,
                null,
                (key, values) => tErrors(key, values),
                locale,
              )
            : null;
          toast.error(reason ?? t("failed"));
          return;
        }

        await clearOfflineData();
        toast.success(t("started", { username }));
        router.push("/dashboard");
        router.refresh();
      } catch {
        toast.error(t("failed"));
      } finally {
        setIsSwitching(false);
      }
    },
    [locale, router, t, tErrors, update],
  );

  const stop = useCallback(async () => {
    const viewedUserId = session?.user?.id;
    setIsSwitching(true);
    try {
      await update({ stopImpersonation: true });
      await clearOfflineData();
      toast.success(t("stopped"));
      router.push(
        viewedUserId ? `/dashboard/users/${viewedUserId}` : "/dashboard",
      );
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  }, [router, session?.user?.id, t, update]);

  return {
    isImpersonating: Boolean(impersonator),
    impersonator,
    viewedUsername: session?.user?.name ?? "",
    isSwitching,
    start,
    stop,
  };
}
