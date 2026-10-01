"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { closeSupportTicket } from "../../actions";

/** "Close request", after a confirmation: a closed request takes no replies. */
export function CloseTicketButton({ ticketId }: { ticketId: string }) {
  const t = useTranslations("support.close");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const result = await closeSupportTicket(ticketId);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("done"));
      setOpen(false);
    });
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Lock aria-hidden />
        {t("action")}
      </Button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={t("title")}
        description={t("description")}
        confirmLabel={t("confirm")}
        onConfirm={confirm}
        pending={isPending}
      />
    </>
  );
}
