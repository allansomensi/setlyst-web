"use client";

import { useState, useTransition } from "react";
import { ScanSearch } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { MODERATION_CHANGED_EVENT } from "@/lib/moderation";
import { rescanModeration } from "../actions";

/** "Reanalisar tudo" (admin): re-checks every username, avatar and logo. */
export function RescanButton() {
  const t = useTranslations("moderation.rescan");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const result = await rescanModeration();
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setOpen(false);
      const flagged = result.data?.flagged ?? 0;
      toast.success(
        flagged > 0 ? t("done", { count: flagged }) : t("doneNone"),
      );
      router.refresh();
      window.dispatchEvent(new Event(MODERATION_CHANGED_EVENT));
    });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ScanSearch aria-hidden />
        {t("button")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("title")}
        description={t("description")}
        confirmLabel={t("confirm")}
        onConfirm={run}
        pending={pending}
      />
    </>
  );
}
