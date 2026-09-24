"use client";

import { useState, useTransition } from "react";
import {
  Coins,
  CreditCard,
  Gift,
  Loader2,
  ReceiptText,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { ClientDate } from "@/components/client-date";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { onFormSubmit } from "@/lib/forms";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { REFUND_REASON_MAX, REFUND_REASON_MIN } from "@/lib/billing-admin";
import type { AdminSubscriptionView } from "@/types/staff";
import {
  adjustUserCredits,
  grantUserPlan,
  refundUserSubscription,
  revokeUserPlan,
} from "@/app/[locale]/dashboard/admin/billing/actions";

interface PlanChoice {
  code: string;
  name: string;
}

const LIVE = new Set(["trialing", "active", "past_due"]);

const STATUS_TONES: Record<string, string> = {
  trialing: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  active:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  past_due:
    "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  canceled: "border-border bg-muted text-muted-foreground",
  expired: "border-border bg-muted text-muted-foreground",
};

const DATE_TIME: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

function GrantDialog({
  userId,
  username,
  plans,
  currentPlan,
  onClose,
}: {
  userId: string;
  username: string;
  plans: PlanChoice[];
  currentPlan: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("billingAdmin.userSubscription");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState(currentPlan ?? plans[0]?.code ?? "");
  const [openEnded, setOpenEnded] = useState(false);
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const daysValue = Number(days);
  const daysInvalid =
    !openEnded &&
    (!Number.isInteger(daysValue) || daysValue < 1 || daysValue > 3650);

  const submit = () => {
    if (daysInvalid || !plan) return;
    startTransition(async () => {
      const result = await grantUserPlan(userId, {
        plan_code: plan,
        days: openEnded ? null : daysValue,
        note: note.trim() || null,
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("granted"));
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("grantTitle")}</DialogTitle>
          <DialogDescription>
            {t("grantDescription", { username })}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onFormSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="grant-plan">{t("plan")}</Label>
            <NativeSelect
              id="grant-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("duration")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="grant-duration"
                checked={!openEnded}
                onChange={() => setOpenEnded(false)}
                className="accent-primary"
              />
              {t("forDays")}
              <Input
                type="number"
                min={1}
                max={3650}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                disabled={openEnded}
                aria-label={t("days")}
                aria-invalid={daysInvalid}
                className="h-8 w-24"
              />
              {t("daysUnit")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="grant-duration"
                checked={openEnded}
                onChange={() => setOpenEnded(true)}
                className="accent-primary"
              />
              {t("openEnded")}
            </label>
            <p className="text-muted-foreground text-xs">{t("durationHint")}</p>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="grant-note">{t("note")}</Label>
            <Textarea
              id="grant-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
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
            <Button type="submit" disabled={pending || daysInvalid || !plan}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("grant")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreditsDialog({
  userId,
  balance,
  onClose,
}: {
  userId: string;
  balance: number;
  onClose: () => void;
}) {
  const t = useTranslations("billingAdmin.userSubscription");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const value = Number(amount);
  const amountInvalid =
    amount.trim() === "" ||
    !Number.isInteger(value) ||
    value === 0 ||
    Math.abs(value) > 100_000;
  const noteInvalid = note.trim().length < 1 || note.trim().length > 255;

  const submit = () => {
    if (amountInvalid || noteInvalid) return;
    startTransition(async () => {
      const result = await adjustUserCredits(userId, {
        amount: value,
        note: note.trim(),
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("creditsAdjusted"));
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("creditsTitle")}</DialogTitle>
          <DialogDescription>
            {t("creditsDescription", { balance })}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onFormSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="credits-amount">{t("amount")}</Label>
            <Input
              id="credits-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
              aria-invalid={amount !== "" && amountInvalid}
            />
            <p className="text-muted-foreground text-xs">
              {!amountInvalid
                ? t("newBalance", { balance: balance + value })
                : t("amountHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="credits-note">{t("reason")}</Label>
            <Input
              id="credits-note"
              value={note}
              maxLength={255}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("reasonPlaceholder")}
            />
            <p className="text-muted-foreground text-xs">{t("reasonHint")}</p>
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
            <Button
              type="submit"
              disabled={pending || amountInvalid || noteInvalid}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("apply")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Subscription, credits and billing history of an account, on the staff
 * user page. Admins can grant a plan (complimentary), end the current one
 * and adjust credits; moderators see the same card read-only.
 */
export function SubscriptionCard({
  userId,
  username,
  view,
  plans,
  canManage,
}: {
  userId: string;
  username: string;
  view: AdminSubscriptionView | null;
  plans: PlanChoice[];
  canManage: boolean;
}) {
  const t = useTranslations("billingAdmin.userSubscription");
  const tStatus = useTranslations("billingAdmin.subscriptionStatus");
  const router = useRouter();
  const locale = useLocale();
  const [dialog, setDialog] = useState<
    "grant" | "credits" | "revoke" | "refund" | null
  >(null);
  const [refundReason, setRefundReason] = useState("");
  const [pending, startTransition] = useTransition();
  const subscription = view?.subscription ?? null;
  const live = subscription ? LIVE.has(subscription.status) : false;
  // Only a card subscription has charges to refund (the API refunds the
  // 7-day withdrawal window, or the latest charge outside it).
  const refundable = live && subscription?.source === "payment";
  const reasonLength = refundReason.trim().length;
  const reasonValid =
    reasonLength >= REFUND_REASON_MIN && reasonLength <= REFUND_REASON_MAX;
  const planName = (code: string | null | undefined) =>
    code ? (plans.find((p) => p.code === code)?.name ?? code) : "";
  const label = (group: string, key: string) =>
    t.has(`${group}.${key}`) ? t(`${group}.${key}`) : key;

  const revoke = () =>
    startTransition(async () => {
      const result = await revokeUserPlan(userId);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setDialog(null);
      toast.success(t("revoked"));
      router.refresh();
    });

  const refund = () =>
    startTransition(async () => {
      if (!reasonValid) return;
      const result = await refundUserSubscription(userId, refundReason);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setDialog(null);
      setRefundReason("");
      const cents = result.data?.refunded_cents ?? 0;
      toast.success(
        cents > 0
          ? t("refunded", {
              amount: formatMoney(
                cents,
                (result.data?.currency ?? "brl").toUpperCase(),
                locale,
              ),
            })
          : t("refundedNothing"),
      );
      router.refresh();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="text-muted-foreground size-4" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {view === null ? (
          <p className="text-muted-foreground text-sm">{t("unavailable")}</p>
        ) : (
          <>
            <div className="bg-muted/40 space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {subscription
                    ? planName(subscription.plan_code)
                    : t("noSubscription")}
                </p>
                {subscription && (
                  <Badge
                    variant="outline"
                    className={cn(STATUS_TONES[subscription.status])}
                  >
                    {tStatus(subscription.status)}
                  </Badge>
                )}
              </div>
              {subscription && (
                <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <dt>{t("source")}</dt>
                  <dd className="text-foreground">
                    {label("sources", subscription.source)}
                  </dd>
                  <dt>{t("startedAt")}</dt>
                  <dd className="text-foreground">
                    <ClientDate
                      value={subscription.started_at}
                      options={DATE_TIME}
                    />
                  </dd>
                  <dt>{t("periodEnd")}</dt>
                  <dd className="text-foreground">
                    {subscription.current_period_end ? (
                      <ClientDate
                        value={subscription.current_period_end}
                        options={DATE_TIME}
                      />
                    ) : (
                      t("noEnd")
                    )}
                  </dd>
                  {subscription.trial_ends_at && (
                    <>
                      <dt>{t("trialEnds")}</dt>
                      <dd className="text-foreground">
                        <ClientDate
                          value={subscription.trial_ends_at}
                          options={DATE_TIME}
                        />
                      </dd>
                    </>
                  )}
                  {subscription.cancel_at_period_end && (
                    <dd className="col-span-2 text-amber-700 dark:text-amber-300">
                      {t("cancelAtPeriodEnd")}
                    </dd>
                  )}
                </dl>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <p className="flex items-center gap-2 text-sm">
                <Coins className="size-4 text-amber-500" aria-hidden />
                {t("credits")}
              </p>
              <p className="font-semibold tabular-nums">
                {view.credits_balance}
              </p>
            </div>

            {canManage && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setDialog("grant")}
                  disabled={plans.length === 0}
                >
                  <Gift aria-hidden />
                  {t("grantButton")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog("credits")}
                >
                  <Coins aria-hidden />
                  {t("creditsButton")}
                </Button>
                {live && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDialog("revoke")}
                  >
                    <XCircle aria-hidden />
                    {t("revokeButton")}
                  </Button>
                )}
                {refundable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setRefundReason("");
                      setDialog("refund");
                    }}
                  >
                    <ReceiptText aria-hidden />
                    {t("refundButton")}
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t("history")}</h3>
              {view.events.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("historyEmpty")}
                </p>
              ) : (
                <ol className="divide-y text-sm">
                  {view.events.slice(0, 10).map((event) => {
                    const note =
                      typeof event.data?.note === "string"
                        ? event.data.note
                        : null;
                    return (
                      <li key={event.id} className="space-y-0.5 py-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium">
                            {label("events", event.kind)}
                          </span>
                          <ClientDate
                            value={event.created_at}
                            className="text-muted-foreground text-xs"
                            options={DATE_TIME}
                          />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {[
                            event.from_plan || event.to_plan
                              ? `${planName(event.from_plan) || "—"} → ${planName(event.to_plan) || "—"}`
                              : null,
                            event.actor_username
                              ? t("by", { username: event.actor_username })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {note && (
                          <p className="text-muted-foreground text-xs italic">
                            {note}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </CardContent>

      {dialog === "grant" && (
        <GrantDialog
          userId={userId}
          username={username}
          plans={plans}
          currentPlan={live ? (subscription?.plan_code ?? null) : null}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "credits" && view && (
        <CreditsDialog
          userId={userId}
          balance={view.credits_balance}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={dialog === "revoke"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("revokeTitle")}
        description={t("revokeDescription", {
          username,
          plan: planName(subscription?.plan_code),
        })}
        confirmLabel={t("revokeButton")}
        destructive
        pending={pending}
        onConfirm={revoke}
      />
      <ConfirmActionDialog
        open={dialog === "refund"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("refundTitle")}
        description={t("refundDescription", {
          username,
          plan: planName(subscription?.plan_code),
        })}
        confirmLabel={t("refundConfirm")}
        destructive
        pending={pending}
        onConfirm={refund}
        confirmDisabled={!reasonValid}
      >
        <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
          <li>{t("refundWindow")}</li>
          <li>{t("refundNow")}</li>
          <li>{t("refundNotice")}</li>
        </ul>
        <div className="space-y-1.5">
          <Label htmlFor="refund-reason">{t("refundReason")}</Label>
          <Textarea
            id="refund-reason"
            rows={3}
            maxLength={REFUND_REASON_MAX}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder={t("refundReasonPlaceholder")}
            aria-invalid={refundReason !== "" && !reasonValid}
            aria-describedby="refund-reason-hint"
          />
          <p id="refund-reason-hint" className="text-muted-foreground text-xs">
            {t("refundReasonHint")}
          </p>
        </div>
      </ConfirmActionDialog>
    </Card>
  );
}
