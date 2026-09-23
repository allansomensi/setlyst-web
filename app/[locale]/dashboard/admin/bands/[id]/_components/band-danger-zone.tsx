"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DangerSection } from "@/components/staff/danger-section";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { deleteBandAsAdmin } from "../../../actions";

export function BandAdminDangerZone({
  bandId,
  name,
}: {
  bandId: string;
  name: string;
}) {
  const t = useTranslations("staff.bandDanger");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <DangerSection
      title={t("title")}
      subtitle={t("subtitle")}
      advice={t("advice")}
      consequences={[
        t("consequenceContent"),
        t("consequenceMembers"),
        t("irreversible"),
      ]}
      buttonLabel={t("delete")}
      confirmTitle={t("confirmTitle", { name })}
      confirmDescription={t("confirmDescription")}
      confirmLabel={t("confirmButton")}
      confirmText={name}
      pending={isPending}
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteBandAsAdmin(bandId);
          if (!result.success) {
            toastActionError(result, result.error);
            return;
          }
          toast.success(t("deleted", { name }));
          router.push("/dashboard/admin/bands");
        })
      }
    />
  );
}
