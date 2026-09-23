"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Plus, Save, X } from "lucide-react";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CreditReward } from "@/types/billing";
import type { BillingSettings } from "@/types/staff";
import { saveBillingSettings } from "../actions";

const MAX_REWARDS = 20;

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  hint,
  className,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  hint?: string;
  className?: string;
}) {
  const invalid = !Number.isInteger(value) || value < min || value > max;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) =>
          onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))
        }
        aria-invalid={invalid}
      />
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function rewardIssue(reward: CreditReward, all: CreditReward[]): string | null {
  const id = reward.id.trim();
  if (!id || id.length > 40) return "id";
  if (all.filter((r) => r.id.trim() === id).length > 1) return "duplicate";
  if (!reward.plan) return "plan";
  if (!Number.isInteger(reward.days) || reward.days < 1 || reward.days > 3650)
    return "days";
  if (
    !Number.isInteger(reward.cost) ||
    reward.cost < 1 ||
    reward.cost > 100_000
  )
    return "cost";
  return null;
}

/**
 * Billing settings (admin): enforcement, trial, referral program and the
 * credit rewards catalog. Turning enforcement on or off asks for a strong
 * confirmation, since it changes what every account can do.
 */
export function BillingSettingsForm({
  initial,
  plans,
}: {
  initial: BillingSettings;
  plans: { code: string; name: string }[];
}) {
  const t = useTranslations("billingAdmin.settings");
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);
  const enforcementChanged = settings.enforced !== initial.enforced;
  const confirmWord = t("enforce.word");

  const numbersValid =
    Number.isInteger(settings.trial_days) &&
    settings.trial_days >= 0 &&
    settings.trial_days <= 365 &&
    [
      settings.referral.referrer_credits,
      settings.referral.referred_credits,
    ].every((n) => Number.isInteger(n) && n >= 0 && n <= 100_000) &&
    Number.isInteger(settings.referral.max_rewarded_per_month) &&
    settings.referral.max_rewarded_per_month >= 0 &&
    settings.referral.max_rewarded_per_month <= 10_000;
  const rewardIssues = settings.rewards.map((r) =>
    rewardIssue(r, settings.rewards),
  );
  const valid =
    numbersValid &&
    rewardIssues.every((i) => i === null) &&
    Boolean(settings.trial_plan);

  const setReferral = (
    key: keyof BillingSettings["referral"],
    value: number | boolean,
  ) =>
    setSettings((s) => ({ ...s, referral: { ...s.referral, [key]: value } }));

  const setReward = (index: number, change: Partial<CreditReward>) =>
    setSettings((s) => ({
      ...s,
      rewards: s.rewards.map((r, i) => (i === index ? { ...r, ...change } : r)),
    }));

  const persist = () =>
    startTransition(async () => {
      const payload: BillingSettings = {
        ...settings,
        rewards: settings.rewards.map((r) => ({ ...r, id: r.id.trim() })),
      };
      const result = await saveBillingSettings(payload);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setConfirming(false);
      setTyped("");
      toast.success(t("saved"));
      router.refresh();
    });

  const onSave = () => {
    if (!valid) {
      toast.error(t("invalid"));
      return;
    }
    if (enforcementChanged) {
      setTyped("");
      setConfirming(true);
      return;
    }
    persist();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-lg border p-4",
            settings.enforced
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5",
          )}
        >
          <div className="space-y-1">
            <Label
              htmlFor="billing-enforced"
              className="text-base font-semibold"
            >
              {t("enforce.label")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {settings.enforced ? t("enforce.onHint") : t("enforce.offHint")}
            </p>
          </div>
          <Switch
            id="billing-enforced"
            checked={settings.enforced}
            onCheckedChange={(enforced) =>
              setSettings((s) => ({ ...s, enforced }))
            }
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t("trial.title")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="trial-days"
              label={t("trial.days")}
              value={settings.trial_days}
              onChange={(trial_days) =>
                setSettings((s) => ({ ...s, trial_days }))
              }
              min={0}
              max={365}
              hint={t("trial.daysHint")}
            />
            <div className="space-y-1.5">
              <Label htmlFor="trial-plan">{t("trial.plan")}</Label>
              <NativeSelect
                id="trial-plan"
                value={settings.trial_plan}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, trial_plan: e.target.value }))
                }
              >
                {!plans.some((p) => p.code === settings.trial_plan) && (
                  <option value={settings.trial_plan}>
                    {settings.trial_plan}
                  </option>
                )}
                {plans.map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </fieldset>

        <Separator />

        <fieldset className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <legend className="text-sm font-semibold">
              {t("referral.title")}
            </legend>
            <div className="flex items-center gap-2">
              <Label htmlFor="referral-enabled" className="text-sm font-normal">
                {t("referral.enabled")}
              </Label>
              <Switch
                id="referral-enabled"
                checked={settings.referral.enabled}
                onCheckedChange={(v) => setReferral("enabled", v)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              id="referrer-credits"
              label={t("referral.referrer")}
              value={settings.referral.referrer_credits}
              onChange={(v) => setReferral("referrer_credits", v)}
              min={0}
              max={100_000}
            />
            <NumberField
              id="referred-credits"
              label={t("referral.referred")}
              value={settings.referral.referred_credits}
              onChange={(v) => setReferral("referred_credits", v)}
              min={0}
              max={100_000}
            />
            <NumberField
              id="referral-max"
              label={t("referral.maxPerMonth")}
              value={settings.referral.max_rewarded_per_month}
              onChange={(v) => setReferral("max_rewarded_per_month", v)}
              min={0}
              max={10_000}
            />
          </div>
          <p className="text-muted-foreground text-xs">{t("referral.hint")}</p>
        </fieldset>

        <Separator />

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">
            {t("rewards.title")}
          </legend>
          <p className="text-muted-foreground text-xs">
            {t("rewards.description")}
          </p>
          {settings.rewards.length === 0 && (
            <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">
              {t("rewards.empty")}
            </p>
          )}
          <ul className="space-y-2">
            {settings.rewards.map((reward, index) => {
              const issue = rewardIssues[index];
              const base = `reward-${index}`;
              return (
                <li
                  key={index}
                  className="grid grid-cols-2 items-end gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_5.5rem_6rem_auto]"
                >
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label htmlFor={`${base}-id`} className="text-xs">
                      {t("rewards.id")}
                    </Label>
                    <Input
                      id={`${base}-id`}
                      value={reward.id}
                      maxLength={40}
                      className="font-mono"
                      onChange={(e) => setReward(index, { id: e.target.value })}
                      aria-invalid={issue === "id" || issue === "duplicate"}
                    />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label htmlFor={`${base}-plan`} className="text-xs">
                      {t("rewards.plan")}
                    </Label>
                    <NativeSelect
                      id={`${base}-plan`}
                      value={reward.plan}
                      onChange={(e) =>
                        setReward(index, { plan: e.target.value })
                      }
                    >
                      {!plans.some((p) => p.code === reward.plan) && (
                        <option value={reward.plan}>
                          {reward.plan || "—"}
                        </option>
                      )}
                      {plans.map((plan) => (
                        <option key={plan.code} value={plan.code}>
                          {plan.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${base}-days`} className="text-xs">
                      {t("rewards.days")}
                    </Label>
                    <Input
                      id={`${base}-days`}
                      type="number"
                      min={1}
                      max={3650}
                      value={Number.isNaN(reward.days) ? "" : reward.days}
                      onChange={(e) =>
                        setReward(index, { days: Number(e.target.value) })
                      }
                      aria-invalid={issue === "days"}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${base}-cost`} className="text-xs">
                      {t("rewards.cost")}
                    </Label>
                    <Input
                      id={`${base}-cost`}
                      type="number"
                      min={1}
                      max={100_000}
                      value={Number.isNaN(reward.cost) ? "" : reward.cost}
                      onChange={(e) =>
                        setReward(index, { cost: Number(e.target.value) })
                      }
                      aria-invalid={issue === "cost"}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="col-span-2 justify-self-end sm:col-span-1"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        rewards: s.rewards.filter((_, i) => i !== index),
                      }))
                    }
                    aria-label={t("rewards.remove", {
                      id: reward.id || index + 1,
                    })}
                    title={t("rewards.remove", { id: reward.id || index + 1 })}
                  >
                    <X />
                  </Button>
                  {issue && (
                    <p
                      className="text-destructive col-span-2 text-xs sm:col-span-5"
                      role="alert"
                    >
                      {t(`rewards.issues.${issue}`)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={settings.rewards.length >= MAX_REWARDS}
            onClick={() =>
              setSettings((s) => ({
                ...s,
                rewards: [
                  ...s.rewards,
                  { id: "", plan: plans[0]?.code ?? "", days: 30, cost: 100 },
                ],
              }))
            }
          >
            <Plus aria-hidden />
            {t("rewards.add")}
          </Button>
        </fieldset>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {dirty && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSettings(initial)}
              disabled={pending}
            >
              {t("reset")}
            </Button>
          )}
          <Button onClick={onSave} disabled={!dirty || pending}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            {t("save")}
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={
          settings.enforced
            ? t("enforce.confirmOnTitle")
            : t("enforce.confirmOffTitle")
        }
        description={
          <div className="space-y-3">
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                {settings.enforced
                  ? t("enforce.confirmOnLead")
                  : t("enforce.confirmOffLead")}
              </p>
            </div>
            <ul className="list-disc space-y-1 pl-5">
              {(settings.enforced
                ? ["on1", "on2", "on3", "on4"]
                : ["off1", "off2", "off3"]
              ).map((key) => (
                <li key={key}>{t(`enforce.consequences.${key}`)}</li>
              ))}
            </ul>
          </div>
        }
        confirmLabel={
          settings.enforced ? t("enforce.confirmOn") : t("enforce.confirmOff")
        }
        destructive
        pending={pending}
        onConfirm={persist}
        confirmDisabled={
          typed.trim().toUpperCase() !== confirmWord.toUpperCase()
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="enforce-confirm">
            {t("enforce.typeToConfirm", { word: confirmWord })}
          </Label>
          <Input
            id="enforce-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="font-mono uppercase"
          />
        </div>
      </ConfirmDialog>
    </Card>
  );
}
