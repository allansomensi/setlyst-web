"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DangerSection } from "@/components/staff/danger-section";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { deleteUser } from "../../actions";

/** Permanent account deletion — see DangerSection for the safeguards. */
export function DangerZone({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const t = useTranslations("staff.danger");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <DangerSection
      title={t("title")}
      subtitle={t("subtitle")}
      advice={t("preferDeactivate")}
      consequences={[
        t("consequencePersonal"),
        t("consequenceBands"),
        t("consequenceIrreversible"),
      ]}
      buttonLabel={t("delete")}
      confirmTitle={t("confirmTitle", { username })}
      confirmDescription={t("confirmDescription")}
      confirmLabel={t("confirmButton")}
      confirmText={username}
      pending={isPending}
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteUser(userId);
          if (!result.success) {
            toastActionError(result, result.error);
            return;
          }
          toast.success(t("deleted", { username }));
          router.push("/dashboard/users");
        })
      }
    />
  );
}
