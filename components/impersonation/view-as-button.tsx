"use client";

import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useImpersonation } from "./use-impersonation";

/**
 * "View as" — opens the app exactly as `username` sees it, read-only.
 * Asks first, because it replaces the staff member's session until they
 * press "Back to my account" in the banner (or it expires).
 */
export function ViewAsButton({
  userId,
  username,
  disabled,
}: {
  userId: string;
  username: string;
  disabled?: boolean;
}) {
  const t = useTranslations("staff.actions");
  const { start, isSwitching } = useImpersonation();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setConfirming(true)}
        disabled={disabled || isSwitching}
      >
        {isSwitching ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Eye className="mr-2 h-4 w-4" />
        )}
        {t("impersonate")}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("confirmImpersonateTitle", { username })}
        description={t("confirmImpersonate")}
        confirmLabel={t("impersonate")}
        pending={isSwitching}
        onConfirm={() => {
          setConfirming(false);
          void start(userId, username);
        }}
      />
    </>
  );
}
