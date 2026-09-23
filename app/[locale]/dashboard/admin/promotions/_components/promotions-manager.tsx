"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientDate } from "@/components/client-date";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useRouter } from "@/i18n/routing";
import { LOCALE_NAMES } from "@/i18n/locales";
import { toastActionError } from "@/lib/action-toast";
import { promotionStatus, STATUS_TONES } from "@/lib/billing-admin";
import {
  isBeforeUtc,
  localInputFromNow,
  localInputToUtcNaive,
  utcNaiveToLocalInput,
} from "@/lib/datetime-local";
import { onFormSubmit } from "@/lib/forms";
import { pickLocalized } from "@/lib/localized";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/types/staff";
import {
  createPromotion,
  deletePromotion,
  updatePromotion,
} from "../../billing/actions";

const LOCALES = ["pt-BR", "en", "es"] as const;
type PromoLocale = (typeof LOCALES)[number];

interface PlanChoice {
  code: string;
  name: string;
}

function PromotionDialog({
  promotion,
  plans,
  onClose,
}: {
  promotion: Promotion | null;
  plans: PlanChoice[];
  onClose: () => void;
}) {
  const t = useTranslations("billingAdmin.promotions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(promotion?.name ?? "");
  const [headline, setHeadline] = useState<Record<PromoLocale, string>>({
    "pt-BR": promotion?.headline?.["pt-BR"] ?? "",
    en: promotion?.headline?.en ?? "",
    es: promotion?.headline?.es ?? "",
  });
  const [locale, setLocale] = useState<PromoLocale>("pt-BR");
  const [plan, setPlan] = useState(promotion?.plan_code ?? "");
  const [percent, setPercent] = useState(
    String(promotion?.discount_percent ?? 20),
  );
  const [startsAt, setStartsAt] = useState(() =>
    promotion
      ? utcNaiveToLocalInput(promotion.starts_at)
      : localInputFromNow(0),
  );
  const [endsAt, setEndsAt] = useState(() =>
    promotion
      ? utcNaiveToLocalInput(promotion.ends_at)
      : localInputFromNow(60 * 24 * 14),
  );
  const [active, setActive] = useState(promotion?.active ?? true);
  const [showErrors, setShowErrors] = useState(false);

  const percentValue = Number(percent);
  const startsUtc = localInputToUtcNaive(startsAt);
  const endsUtc = localInputToUtcNaive(endsAt);
  const headlineTooLong = LOCALES.some((l) => headline[l].trim().length > 120);
  const errors = {
    name: name.trim().length < 1 || name.trim().length > 80,
    percent:
      !Number.isInteger(percentValue) || percentValue < 1 || percentValue > 100,
    window: !startsUtc || !endsUtc || !isBeforeUtc(startsUtc, endsUtc),
    headline: headlineTooLong,
  };
  const valid = !Object.values(errors).some(Boolean);
  const err = (flag: boolean) => showErrors && flag;

  const submit = () => {
    setShowErrors(true);
    if (!valid || !startsUtc || !endsUtc) return;
    const headlineMap: Record<string, string> = {};
    for (const l of LOCALES) {
      const value = headline[l].trim();
      if (value) headlineMap[l] = value;
    }
    const payload = {
      name: name.trim(),
      headline: headlineMap,
      plan_code: plan || null,
      discount_percent: percentValue,
      starts_at: startsUtc,
      ends_at: endsUtc,
      active,
    };
    startTransition(async () => {
      const result = promotion
        ? await updatePromotion(promotion.id, payload)
        : await createPromotion(payload);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(promotion ? t("updated") : t("created"));
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {promotion ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onFormSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="promotion-name">{t("fields.name")}</Label>
            <Input
              id="promotion-name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={err(errors.name)}
              placeholder={t("fields.namePlaceholder")}
            />
            <p className="text-muted-foreground text-xs">
              {t("fields.nameHint")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="promotion-headline">{t("fields.headline")}</Label>
            <Tabs
              value={locale}
              onValueChange={(v) => setLocale(v as PromoLocale)}
            >
              <TabsList>
                {LOCALES.map((l) => (
                  <TabsTrigger key={l} value={l}>
                    {LOCALE_NAMES[l]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Input
              id="promotion-headline"
              lang={locale}
              value={headline[locale]}
              maxLength={140}
              onChange={(e) =>
                setHeadline((h) => ({ ...h, [locale]: e.target.value }))
              }
              aria-invalid={err(errors.headline)}
              placeholder={t("fields.headlinePlaceholder")}
            />
            <p className="text-muted-foreground text-xs">
              {t("fields.headlineHint")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="promotion-plan">{t("fields.plan")}</Label>
              <NativeSelect
                id="promotion-plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                <option value="">{t("allPlans")}</option>
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promotion-percent">{t("fields.percent")}</Label>
              <Input
                id="promotion-percent"
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                aria-invalid={err(errors.percent)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promotion-starts">{t("fields.startsAt")}</Label>
              <Input
                id="promotion-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                aria-invalid={err(errors.window)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promotion-ends">{t("fields.endsAt")}</Label>
              <Input
                id="promotion-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                aria-invalid={err(errors.window)}
              />
            </div>
            {err(errors.window) && (
              <p
                className="text-destructive text-xs sm:col-span-2"
                role="alert"
              >
                {t("fields.windowError")}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
            <div>
              <Label htmlFor="promotion-active">{t("fields.active")}</Label>
              <p className="text-muted-foreground text-xs">
                {t("fields.activeHint")}
              </p>
            </div>
            <Switch
              id="promotion-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {promotion ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PromotionsManager({
  promotions,
  plans,
}: {
  promotions: Promotion[];
  plans: PlanChoice[];
}) {
  const t = useTranslations("billingAdmin.promotions");
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const planName = (code: string | null) =>
    code ? (plans.find((p) => p.code === code)?.name ?? code) : t("allPlans");

  const toggleActive = (promotion: Promotion, active: boolean) => {
    setTogglingId(promotion.id);
    startTransition(async () => {
      const result = await updatePromotion(promotion.id, {
        name: promotion.name,
        headline: promotion.headline,
        plan_code: promotion.plan_code,
        discount_percent: promotion.discount_percent,
        starts_at: promotion.starts_at,
        ends_at: promotion.ends_at,
        active,
      });
      setTogglingId(null);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(active ? t("activated") : t("deactivated"));
      router.refresh();
    });
  };

  const remove = () =>
    startTransition(async () => {
      if (!deleting) return;
      const result = await deletePromotion(deleting.id);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("deleted"));
      setDeleting(null);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          {t("new")}
        </Button>
      </div>

      {promotions.length === 0 ? (
        <div className="bg-card text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
          <p className="text-foreground font-medium">{t("emptyTitle")}</p>
          <p className="max-w-md text-sm">{t("emptyDescription")}</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {promotions.map((promotion) => {
            const status = promotionStatus(promotion);
            const headline = pickLocalized(promotion.headline, locale);
            return (
              <li key={promotion.id}>
                <Card className="h-full gap-0 py-0">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full font-semibold tabular-nums">
                        {promotion.discount_percent}
                        <Percent className="size-3" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{promotion.name}</p>
                          <Badge
                            variant="outline"
                            className={cn(STATUS_TONES[status])}
                          >
                            {t(`status.${status}`)}
                          </Badge>
                        </div>
                        {headline && (
                          <p className="text-muted-foreground text-sm">
                            {headline}
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {planName(promotion.plan_code)} ·{" "}
                          <ClientDate
                            value={promotion.starts_at}
                            options={{ dateStyle: "short", timeStyle: "short" }}
                          />
                          {" → "}
                          <ClientDate
                            value={promotion.ends_at}
                            options={{ dateStyle: "short", timeStyle: "short" }}
                          />
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`promotion-active-${promotion.id}`}
                          checked={promotion.active}
                          disabled={pending && togglingId === promotion.id}
                          onCheckedChange={(v) => toggleActive(promotion, v)}
                        />
                        <Label
                          htmlFor={`promotion-active-${promotion.id}`}
                          className="text-sm font-normal"
                        >
                          {t("fields.active")}
                        </Label>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(promotion)}
                        >
                          <Pencil aria-hidden />
                          {t("edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleting(promotion)}
                          aria-label={t("deleteNamed", {
                            name: promotion.name,
                          })}
                          title={t("deleteNamed", { name: promotion.name })}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <PromotionDialog
          promotion={editing === "new" ? null : editing}
          plans={plans}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle", { name: deleting?.name ?? "" })}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        destructive
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}
