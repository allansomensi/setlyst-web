"use client";

import { useState, useTransition } from "react";
import {
  Copy,
  History,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientDate } from "@/components/client-date";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { promoCodeStatus, STATUS_TONES } from "@/lib/billing-admin";
import { copyText } from "@/lib/clipboard";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { PromoCode } from "@/types/staff";
import { updatePromoCode } from "../../billing/actions";
import {
  EditPromoCodeDialog,
  RedemptionsDialog,
  type PlanChoice,
} from "./promo-code-dialogs";

export function PromoCodesTable({
  codes,
  plans,
}: {
  codes: PromoCode[];
  plans: PlanChoice[];
}) {
  const t = useTranslations("billingAdmin.promoCodes");
  const router = useRouter();
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [viewing, setViewing] = useState<PromoCode | null>(null);
  const [toggling, setToggling] = useState<PromoCode | null>(null);
  const [pending, startTransition] = useTransition();
  const planName = (code: string | null) =>
    plans.find((p) => p.code === code)?.name ?? code ?? "";

  const value = (promo: PromoCode) => {
    switch (promo.kind) {
      case "plan_grant":
        return t("values.plan_grant", {
          plan: planName(promo.plan_code),
          days: promo.duration_days ?? 0,
        });
      case "trial_extension":
        return t("values.trial_extension", { days: promo.duration_days ?? 0 });
      case "credits":
        return t("values.credits", { credits: promo.credits ?? 0 });
      case "discount":
        return t("values.discount", { percent: promo.discount_percent ?? 0 });
    }
  };

  const toggle = () =>
    startTransition(async () => {
      if (!toggling) return;
      const disable = !toggling.disabled_at;
      const result = await updatePromoCode(toggling.id, { disabled: disable });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(disable ? t("disabled") : t("enabled"));
      setToggling(null);
      router.refresh();
    });

  return (
    <>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.benefit")}</TableHead>
              <TableHead>{t("columns.usage")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.window")}
              </TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((promo) => {
              const status = promoCodeStatus(promo);
              const usage =
                promo.max_redemptions !== null
                  ? Math.min(
                      100,
                      (promo.redemptions_count / promo.max_redemptions) * 100,
                    )
                  : null;
              return (
                <TableRow key={promo.id}>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm font-semibold">
                        {promo.code}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={async () => {
                          await copyText(promo.code);
                          toast.success(t("copied"));
                        }}
                        aria-label={t("copy", { code: promo.code })}
                        title={t("copy", { code: promo.code })}
                      >
                        <Copy />
                      </Button>
                    </div>
                    {promo.description && (
                      <p
                        className="text-muted-foreground max-w-56 truncate text-xs"
                        title={promo.description}
                      >
                        {promo.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-sm">{value(promo)}</p>
                    <p className="text-muted-foreground text-xs">
                      {t(`kinds.${promo.kind}`)}
                      {promo.new_users_only && ` · ${t("newUsersOnly")}`}
                    </p>
                  </TableCell>
                  <TableCell className="min-w-28 align-top">
                    <p className="text-sm tabular-nums">
                      {promo.max_redemptions !== null
                        ? t("usageOf", {
                            used: promo.redemptions_count,
                            max: promo.max_redemptions,
                          })
                        : t("usageUnlimited", {
                            used: promo.redemptions_count,
                          })}
                    </p>
                    {usage !== null && (
                      <div
                        className="bg-muted mt-1 h-1.5 w-24 overflow-hidden rounded-full"
                        aria-hidden
                      >
                        <div
                          className="bg-primary h-full"
                          style={{ width: `${usage}%` }}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant="outline"
                      className={cn(STATUS_TONES[status])}
                    >
                      {t(`status.${status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden align-top text-xs lg:table-cell">
                    {promo.starts_at ? (
                      <ClientDate
                        value={promo.starts_at}
                        options={{ dateStyle: "short" }}
                      />
                    ) : (
                      t("fromCreation")
                    )}
                    {" → "}
                    {promo.expires_at ? (
                      <ClientDate
                        value={promo.expires_at}
                        options={{ dateStyle: "short" }}
                      />
                    ) : (
                      t("noExpiry")
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("actionsFor", { code: promo.code })}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(promo)}>
                          <Pencil className="mr-2 size-4" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setViewing(promo)}>
                          <History className="mr-2 size-4" />
                          {t("redemptions")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setToggling(promo)}>
                          {promo.disabled_at ? (
                            <Power className="mr-2 size-4" />
                          ) : (
                            <PowerOff className="mr-2 size-4" />
                          )}
                          {promo.disabled_at ? t("enable") : t("disable")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <EditPromoCodeDialog promo={editing} onClose={() => setEditing(null)} />
      )}
      {viewing && (
        <RedemptionsDialog promo={viewing} onClose={() => setViewing(null)} />
      )}
      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(open) => !open && setToggling(null)}
        title={
          toggling?.disabled_at
            ? t("enableTitle", { code: toggling.code })
            : t("disableTitle", { code: toggling?.code ?? "" })
        }
        description={
          toggling?.disabled_at
            ? t("enableDescription")
            : t("disableDescription")
        }
        confirmLabel={toggling?.disabled_at ? t("enable") : t("disable")}
        destructive={!toggling?.disabled_at}
        pending={pending}
        onConfirm={toggle}
      />
    </>
  );
}
