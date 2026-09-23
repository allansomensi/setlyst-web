"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/components/nav-link";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useRouter } from "@/i18n/routing";
import { LOCALE_NAMES } from "@/i18n/locales";
import { toastActionError } from "@/lib/action-toast";
import { LIMITABLE_QUOTA_RESOURCES } from "@/lib/api-errors";
import { centsToReais, reaisToCents } from "@/lib/billing-admin";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/billing";
import { PLAN_FEATURES } from "@/types/public";
import { savePlan } from "../actions";

const LOCALES = ["pt-BR", "en", "es"] as const;
type PlanLocale = (typeof LOCALES)[number];
const REQUIRED: PlanLocale[] = ["pt-BR", "en"];
const CURRENCIES = ["BRL", "USD", "EUR"];
const MAX_LIMIT = 1_000_000;
const PLAN_CODE = /^[a-z][a-z0-9_]{1,31}$/;

interface PlanForm {
  code: string;
  name: Record<PlanLocale, string>;
  description: Record<PlanLocale, string>;
  monthly: string;
  yearly: string;
  currency: string;
  limits: Record<string, string>;
  features: Record<string, boolean>;
  highlighted: boolean;
  is_public: boolean;
  sort_order: string;
}

function toForm(plan: Plan | null): PlanForm {
  const text = (map: Partial<Record<string, string>> | undefined) => ({
    "pt-BR": map?.["pt-BR"] ?? "",
    en: map?.en ?? "",
    es: map?.es ?? "",
  });
  return {
    code: plan?.code ?? "",
    name: text(plan?.name),
    description: text(plan?.description),
    monthly: centsToReais(plan?.price_monthly_cents ?? 0),
    yearly: centsToReais(plan?.price_yearly_cents ?? 0),
    currency: plan?.currency ?? "BRL",
    limits: Object.fromEntries(
      LIMITABLE_QUOTA_RESOURCES.map((r) => [r, String(plan?.limits?.[r] ?? 0)]),
    ),
    features: Object.fromEntries(
      PLAN_FEATURES.map((f) => [f, Boolean(plan?.features?.[f])]),
    ),
    highlighted: plan?.highlighted ?? false,
    is_public: plan?.is_public ?? false,
    sort_order: String(plan?.sort_order ?? 100),
  };
}

function localized(map: Record<PlanLocale, string>, keepEmpty: boolean) {
  const out: Record<string, string> = {};
  for (const locale of LOCALES) {
    const value = map[locale].trim();
    if (value || (keepEmpty && REQUIRED.includes(locale))) out[locale] = value;
  }
  return out;
}

/**
 * Plan editor (admin): localized name and description, prices typed in
 * reais (stored in cents), limits, features and display options.
 */
/**
 * Creates or edits a plan (admins). With `readOnly` (moderators) the same
 * screen only shows the plan: every field is disabled and nothing saves.
 */
export function PlanEditor({
  plan,
  readOnly = false,
}: {
  plan: Plan | null;
  readOnly?: boolean;
}) {
  const t = useTranslations("billingAdmin.planEditor");
  const tQuota = useTranslations("quotas.resources");
  const tFeatures = useTranslations("pricing.features");
  const router = useRouter();
  const [initial, setInitial] = useState(() => toForm(plan));
  const [form, setForm] = useState(initial);
  const [locale, setLocale] = useState<PlanLocale>("pt-BR");
  const [showErrors, setShowErrors] = useState(false);
  const [pending, startTransition] = useTransition();
  const isNew = plan === null;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const guard = useUnsavedChangesGuard(dirty && !pending && !readOnly);

  const monthly = reaisToCents(form.monthly);
  const yearly = reaisToCents(form.yearly);
  const sortOrder = Number(form.sort_order);
  const limitErrors = LIMITABLE_QUOTA_RESOURCES.filter((r) => {
    const n = Number(form.limits[r]);
    return (
      form.limits[r].trim() === "" ||
      !Number.isInteger(n) ||
      n < 0 ||
      n > MAX_LIMIT
    );
  });
  const nameErrors = LOCALES.filter((l) => {
    const len = form.name[l].trim().length;
    return (REQUIRED.includes(l) && len === 0) || len > 60;
  });
  const descriptionErrors = LOCALES.filter(
    (l) => form.description[l].trim().length > 400,
  );
  const errors = {
    code:
      isNew &&
      !(
        PLAN_CODE.test(form.code) &&
        !["none", "trial", "new"].includes(form.code)
      ),
    monthly: monthly === null || monthly > 100_000_000,
    yearly: yearly === null || yearly > 1_000_000_000,
    sort:
      !Number.isInteger(sortOrder) || sortOrder < -10_000 || sortOrder > 10_000,
  };
  const valid =
    !Object.values(errors).some(Boolean) &&
    limitErrors.length === 0 &&
    nameErrors.length === 0 &&
    descriptionErrors.length === 0;
  const badLocales = new Set(
    showErrors ? [...nameErrors, ...descriptionErrors] : [],
  );

  const set = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    setShowErrors(true);
    if (!valid || monthly === null || yearly === null) {
      toast.error(t("invalid"));
      const bad = nameErrors[0] ?? descriptionErrors[0];
      if (bad) setLocale(bad);
      return;
    }
    startTransition(async () => {
      const result = await savePlan(form.code, {
        name: localized(form.name, true),
        description: localized(form.description, false),
        price_monthly_cents: monthly,
        price_yearly_cents: yearly,
        currency: form.currency,
        limits: Object.fromEntries(
          LIMITABLE_QUOTA_RESOURCES.map((r) => [r, Number(form.limits[r])]),
        ),
        features: form.features,
        highlighted: form.highlighted,
        is_public: form.is_public,
        sort_order: sortOrder,
      });
      if (!result.success || !result.data) {
        toastActionError(result, result.success ? t("invalid") : result.error);
        return;
      }
      const next = toForm(result.data);
      setInitial(next);
      setForm(next);
      setShowErrors(false);
      toast.success(t("saved"));
      guard.release();
      if (isNew)
        router.replace(`/dashboard/admin/billing/plans/${result.data.code}`);
      else router.refresh();
    });
  };

  const err = (flag: boolean) => showErrors && flag;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/admin/billing">
              <ArrowLeft aria-hidden />
              {t("back")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isNew
                ? t("newTitle")
                : t("editTitle", { name: form.name["pt-BR"] || form.code })}
            </h1>
            {!isNew && (
              <Badge variant="secondary" className="font-mono">
                {form.code}
              </Badge>
            )}
            {dirty && !readOnly && (
              <Badge variant="secondary">{t("unsaved")}</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {readOnly ? t("readOnly") : t("description")}
          </p>
        </div>
        {!readOnly && (
          <Button onClick={save} disabled={pending || (!dirty && !isNew)}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            {t("save")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("identity.title")}</CardTitle>
            <CardDescription>{t("identity.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isNew && (
              <div className="space-y-1.5">
                <Label htmlFor="plan-code">{t("identity.code")}</Label>
                <Input
                  id="plan-code"
                  disabled={readOnly}
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toLowerCase())}
                  className="font-mono"
                  placeholder="studio"
                  aria-invalid={err(errors.code)}
                  spellCheck={false}
                />
                <p
                  className={cn(
                    "text-xs",
                    err(errors.code)
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {t("identity.codeHint")}
                </p>
              </div>
            )}
            <Tabs
              value={locale}
              onValueChange={(v) => setLocale(v as PlanLocale)}
            >
              <TabsList>
                {LOCALES.map((code) => (
                  <TabsTrigger key={code} value={code}>
                    {LOCALE_NAMES[code]}
                    {REQUIRED.includes(code) && (
                      <span
                        className="text-muted-foreground text-xs"
                        aria-hidden
                      >
                        *
                      </span>
                    )}
                    {badLocales.has(code) && (
                      <span className="bg-destructive size-1.5 rounded-full">
                        <span className="sr-only">
                          {t("identity.hasErrors")}
                        </span>
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <p className="text-muted-foreground text-xs">
              {REQUIRED.includes(locale)
                ? t("identity.required")
                : t("identity.optional")}
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="plan-name">{t("identity.name")}</Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {form.name[locale].trim().length}/60
                </span>
              </div>
              <Input
                id="plan-name"
                disabled={readOnly}
                lang={locale}
                value={form.name[locale]}
                onChange={(e) =>
                  set("name", { ...form.name, [locale]: e.target.value })
                }
                aria-invalid={err(nameErrors.includes(locale))}
                placeholder={
                  locale === "es" ? form.name.en || undefined : undefined
                }
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="plan-description">
                  {t("identity.planDescription")}
                </Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {form.description[locale].trim().length}/400
                </span>
              </div>
              <Textarea
                id="plan-description"
                disabled={readOnly}
                lang={locale}
                rows={3}
                value={form.description[locale]}
                onChange={(e) =>
                  set("description", {
                    ...form.description,
                    [locale]: e.target.value,
                  })
                }
                aria-invalid={err(descriptionErrors.includes(locale))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("pricing.title")}</CardTitle>
            <CardDescription>{t("pricing.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
              <div className="space-y-1.5">
                <Label htmlFor="plan-monthly">{t("pricing.monthly")}</Label>
                <Input
                  id="plan-monthly"
                  disabled={readOnly}
                  inputMode="decimal"
                  value={form.monthly}
                  onChange={(e) => set("monthly", e.target.value)}
                  aria-invalid={err(errors.monthly)}
                />
                <p className="text-muted-foreground text-xs tabular-nums">
                  {monthly === null
                    ? t("pricing.invalidAmount")
                    : t("pricing.cents", { cents: monthly })}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-yearly">{t("pricing.yearly")}</Label>
                <Input
                  id="plan-yearly"
                  disabled={readOnly}
                  inputMode="decimal"
                  value={form.yearly}
                  onChange={(e) => set("yearly", e.target.value)}
                  aria-invalid={err(errors.yearly)}
                />
                <p className="text-muted-foreground text-xs tabular-nums">
                  {yearly === null
                    ? t("pricing.invalidAmount")
                    : t("pricing.cents", { cents: yearly })}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-currency">{t("pricing.currency")}</Label>
                <NativeSelect
                  id="plan-currency"
                  disabled={readOnly}
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  {Array.from(new Set([form.currency, ...CURRENCIES])).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
                <div>
                  <Label htmlFor="plan-public">{t("display.public")}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t("display.publicHint")}
                  </p>
                </div>
                <Switch
                  id="plan-public"
                  disabled={readOnly}
                  checked={form.is_public}
                  onCheckedChange={(v) => set("is_public", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
                <div>
                  <Label htmlFor="plan-highlighted">
                    {t("display.highlighted")}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {t("display.highlightedHint")}
                  </p>
                </div>
                <Switch
                  id="plan-highlighted"
                  disabled={readOnly}
                  checked={form.highlighted}
                  onCheckedChange={(v) => set("highlighted", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
                <div>
                  <Label htmlFor="plan-order">{t("display.order")}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t("display.orderHint")}
                  </p>
                </div>
                <Input
                  id="plan-order"
                  disabled={readOnly}
                  type="number"
                  className="w-24"
                  value={form.sort_order}
                  onChange={(e) => set("sort_order", e.target.value)}
                  aria-invalid={err(errors.sort)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("features.title")}</CardTitle>
            <CardDescription>{t("features.description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {PLAN_FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <Label htmlFor={`feature-${feature}`} className="font-normal">
                  {tFeatures.has(feature) ? tFeatures(feature) : feature}
                </Label>
                <Switch
                  id={`feature-${feature}`}
                  disabled={readOnly}
                  checked={form.features[feature]}
                  onCheckedChange={(v) =>
                    set("features", { ...form.features, [feature]: v })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("limits.title")}</CardTitle>
            <CardDescription>{t("limits.description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {LIMITABLE_QUOTA_RESOURCES.map((resource) => (
              <div key={resource} className="space-y-1">
                <Label htmlFor={`limit-${resource}`} className="text-xs">
                  {tQuota(resource)}
                </Label>
                <Input
                  id={`limit-${resource}`}
                  disabled={readOnly}
                  type="number"
                  min={0}
                  max={MAX_LIMIT}
                  value={form.limits[resource]}
                  onChange={(e) =>
                    set("limits", {
                      ...form.limits,
                      [resource]: e.target.value,
                    })
                  }
                  aria-invalid={err(limitErrors.includes(resource))}
                />
              </div>
            ))}
            <p className="text-muted-foreground col-span-full text-xs">
              {t("limits.hint")}
            </p>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={guard.isConfirming}
        onOpenChange={(open) => !open && guard.cancelLeave()}
        title={t("leave.title")}
        description={t("leave.description")}
        confirmLabel={t("leave.confirm")}
        destructive
        onConfirm={guard.confirmLeave}
      />
    </div>
  );
}
