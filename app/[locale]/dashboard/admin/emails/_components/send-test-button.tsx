"use client";

import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { sendTestEmail } from "../actions";

/**
 * Queues a test message to the caller's own address, to check delivery
 * end to end (it then shows up in the list below).
 */
export function SendTestEmailButton({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("emailsAdmin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      const result = await sendTestEmail();
      if (!result.success || !result.data) {
        toastActionError(
          result,
          result.success ? t("test.failed") : result.error,
        );
        return;
      }
      toast.success(t("test.queued", { to: result.data.to }));
      router.refresh();
    });

  return (
    <Button
      variant="outline"
      onClick={send}
      disabled={disabled || pending}
      title={disabled ? t("test.notConfigured") : undefined}
    >
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Send aria-hidden />
      )}
      {t("test.button")}
    </Button>
  );
}
