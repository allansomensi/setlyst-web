"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { requestImpersonation } from "@/lib/actions/impersonation";
import { toastActionError } from "@/lib/action-toast";

/**
 * Starts and stops "view as another user". Starting asks the API for a
 * read-only token, then swaps it into the session; stopping restores the
 * staff member's own session. Both do a full refresh so every server
 * component re-renders with the right identity.
 */
export function useImpersonation() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const t = useTranslations("impersonation");
  const [isSwitching, setIsSwitching] = useState(false);

  const impersonator = session?.user?.impersonator;

  const start = useCallback(
    async (userId: string, username: string) => {
      setIsSwitching(true);
      try {
        const result = await requestImpersonation(userId);
        if (!result.success || !result.data) {
          toastActionError(result, result.success ? t("failed") : result.error);
          return;
        }

        const next = await update({ impersonationToken: result.data.token });
        if (!next?.user?.impersonator) {
          toast.error(t("failed"));
          return;
        }

        toast.success(t("started", { username }));
        router.push("/dashboard");
        router.refresh();
      } finally {
        setIsSwitching(false);
      }
    },
    [router, t, update],
  );

  const stop = useCallback(async () => {
    const viewedUserId = session?.user?.id;
    setIsSwitching(true);
    try {
      await update({ stopImpersonation: true });
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
