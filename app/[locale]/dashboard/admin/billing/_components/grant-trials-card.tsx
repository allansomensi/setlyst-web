"use client";

import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { grantTrials } from "../actions";

/** "Conceder período de teste a contas sem assinatura" (admin). */
export function GrantTrialsCard({
  defaultDays,
  withoutSubscription,
  trialPlan,
}: {
  defaultDays: number;
  withoutSubscription: number | null;
  trialPlan: string;
}) {
  const t = useTranslations("billingAdmin.grantTrials");
  const router = useRouter();
  const [days, setDays] = useState(defaultDays);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const valid = Number.isInteger(days) && days >= 1 && days <= 365;

  const run = () =>
    startTransition(async () => {
      const result = await grantTrials(days);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setOpen(false);
      toast.success(t("done", { count: result.data ?? 0 }));
      router.refresh();
    });

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="text-primary size-4" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description", { plan: trialPlan })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {withoutSubscription !== null && (
          <p className="text-sm">
            {t("eligible", { count: withoutSubscription })}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="grant-trial-days">{t("days")}</Label>
          <Input
            id="grant-trial-days"
            type="number"
            min={1}
            max={365}
            value={Number.isNaN(days) ? "" : days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-invalid={!valid}
          />
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setOpen(true)}
          disabled={!valid || withoutSubscription === 0}
        >
          {t("button")}
        </Button>
      </CardContent>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("confirmTitle")}
        description={t("confirmDescription", {
          count: withoutSubscription ?? 0,
          days,
          plan: trialPlan,
        })}
        confirmLabel={t("confirm")}
        pending={pending}
        onConfirm={run}
      />
    </Card>
  );
}
