"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IntervalToggle } from "@/components/pricing/pricing-plans";
import { useAppRouter } from "@/hooks/use-app-router";
import {
  changePaidPlan,
  openBillingPortal,
  startCheckout,
} from "@/lib/actions/billing";
import { toastActionError } from "@/lib/action-toast";
import { formatApiDate, parseApiTimestamp } from "@/lib/dates";
import { pickLocalized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import {
  isPromotionActive,
  maxYearlySavings,
  planPrice,
  type BillingInterval,
} from "@/lib/pricing";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { BillingMe, Subscription } from "@/types/billing";
import type { PublicPlan } from "@/types/public";

/**
 * The API carries an in-app trial over to the first charge only when more
 * than this is left (Stripe needs the trial end at least 48 hours out).
 */
const TRIAL_CARRY_MIN_MS = 49 * 60 * 60 * 1000;

/** A paid subscription Stripe is still charging (or retrying). */
export function isPaidAndLive(subscription: Subscription | null): boolean {
  return (
    subscription?.source === "payment" &&
    (subscription.status === "active" || subscription.status === "past_due")
  );
}

/** Whether this account can use checkout / the portal at all. */
export function paymentsAvailable(billing: BillingMe): boolean {
  return billing.enforced && billing.payments_enabled === true;
}

type PickerMode = "checkout" | "change";

// ---------------------------------------------------------------------
// Plan card footer
// ---------------------------------------------------------------------

/**
 * Subscribe (no paid plan yet) or change plan / manage payment (paying).
 */
export function PaidPlanActions({
  billing,
  plans,
  readOnly,
}: {
  billing: BillingMe;
  plans: PublicPlan[];
  readOnly: boolean;
}) {
  const t = useTranslations("billing.checkout");
  const locale = useLocale();
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  const subscription = billing.subscription;
  const paying = isPaidAndLive(subscription);
  const purchasable = plans.filter(
    (plan) => plan.price_monthly_cents > 0 || plan.price_yearly_cents > 0,
  );

  const goToPortal = async () => {
    if (portalPending) return;
    setPortalPending(true);
    const result = await openBillingPortal();
    if (!result.success || !result.data) {
      setPortalPending(false);
      if (!result.success) toastActionError(result, result.error);
      return;
    }
    window.location.assign(result.data.url);
  };

  const changeBlocked =
    subscription?.status === "past_due"
      ? t("changeBlockedPastDue")
      : subscription?.cancel_at_period_end
        ? t("changeBlockedCanceling")
        : null;

  return (
    <div className="flex w-full flex-col gap-3">
      {paying && subscription?.status === "past_due" && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>{t("pastDue")}</AlertDescription>
        </Alert>
      )}
      {paying && subscription?.cancel_at_period_end && (
        <Alert variant="info">
          <TriangleAlert />
          <AlertDescription>
            {t("canceling", {
              date: formatApiDate(subscription.current_period_end, locale),
            })}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Lock className="size-4 shrink-0" />
          {t("secure")}
        </p>
        <div className="flex flex-wrap gap-2">
          {paying ? (
            <>
              <Button
                variant="outline"
                onClick={() => setPicker("change")}
                disabled={readOnly || Boolean(changeBlocked)}
                title={changeBlocked ?? undefined}
              >
                <ArrowLeftRight className="mr-2 size-4" />
                {t("changePlan")}
              </Button>
              <Button onClick={goToPortal} disabled={readOnly || portalPending}>
                {portalPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 size-4" />
                )}
                {t("manage")}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setPicker("checkout")}
              disabled={readOnly || purchasable.length === 0}
            >
              <Sparkles className="mr-2 size-4" />
              {t("subscribe")}
            </Button>
          )}
        </div>
      </div>
      {paying && changeBlocked && (
        <p className="text-muted-foreground text-xs">{changeBlocked}</p>
      )}

      <PlanPickerDialog
        open={picker !== null}
        mode={picker ?? "checkout"}
        onOpenChange={(open) => !open && setPicker(null)}
        plans={purchasable}
        subscription={subscription}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Plan picker
// ---------------------------------------------------------------------

function PlanPickerDialog({
  open,
  mode,
  onOpenChange,
  plans,
  subscription,
}: {
  open: boolean;
  mode: PickerMode;
  onOpenChange: (open: boolean) => void;
  plans: PublicPlan[];
  subscription: Subscription | null;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {/* Mounted per opening, so every opening starts from fresh choices. */}
        {open && (
          <PlanPickerBody
            mode={mode}
            plans={plans}
            subscription={subscription}
            pending={pending}
            setPending={setPending}
            close={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanPickerBody({
  mode,
  plans,
  subscription,
  pending,
  setPending,
  close,
}: {
  mode: PickerMode;
  plans: PublicPlan[];
  subscription: Subscription | null;
  pending: boolean;
  setPending: (pending: boolean) => void;
  close: () => void;
}) {
  const t = useTranslations("billing.checkout");
  const tPricing = useTranslations("pricing");
  const locale = useLocale();
  const router = useAppRouter();
  const currentPlan = mode === "change" ? subscription?.plan_code : null;
  const currentInterval =
    mode === "change" ? (subscription?.billing_interval ?? null) : null;

  const [interval, setInterval] = useState<BillingInterval>(
    currentInterval ?? "monthly",
  );
  // When the picker opened (for the trial carry-over hint).
  const [openedAt] = useState(() => Date.now());
  const [selected, setSelected] = useState<string | null>(
    () =>
      (subscription?.plan_code &&
      plans.some((p) => p.code === subscription.plan_code)
        ? subscription.plan_code
        : (plans.find((p) => p.highlighted) ?? plans[0])?.code) ?? null,
  );

  const chosen = plans.find((p) => p.code === selected) ?? null;
  const unchanged =
    mode === "change" &&
    chosen?.code === currentPlan &&
    interval === currentInterval;

  const promotionOf = (plan: PublicPlan) =>
    mode === "checkout" &&
    plan.promotion &&
    isPromotionActive(plan.promotion.ends_at)
      ? plan.promotion
      : null;

  const trialEnd =
    mode === "checkout" &&
    subscription?.status === "trialing" &&
    subscription.trial_ends_at
      ? parseApiTimestamp(subscription.trial_ends_at)
      : null;
  const carriesTrial =
    trialEnd !== null &&
    trialEnd.getTime() - openedAt > TRIAL_CARRY_MIN_MS &&
    chosen !== null &&
    promotionOf(chosen) === null;

  const confirm = async () => {
    if (!chosen || pending || unchanged) return;
    setPending(true);
    if (mode === "checkout") {
      const result = await startCheckout(chosen.code, interval);
      if (!result.success || !result.data) {
        setPending(false);
        if (!result.success) toastActionError(result, result.error);
        return;
      }
      // Stays "pending" while the browser leaves for Stripe.
      window.location.assign(result.data.url);
      return;
    }
    const result = await changePaidPlan(chosen.code, interval);
    setPending(false);
    if (!result.success) {
      toastActionError(result, result.error);
      return;
    }
    toast.success(
      t("changed", {
        plan: pickLocalized(chosen.name, locale) || chosen.code,
      }),
    );
    close();
    router.refresh();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "checkout" ? t("pickTitle") : t("changeTitle")}
        </DialogTitle>
        <DialogDescription>
          {mode === "checkout" ? t("pickDescription") : t("changeDescription")}
        </DialogDescription>
      </DialogHeader>

      <div className="flex justify-center">
        <IntervalToggle
          value={interval}
          onChange={setInterval}
          savings={maxYearlySavings(plans)}
        />
      </div>

      <div role="radiogroup" aria-label={t("planLabel")} className="grid gap-2">
        {plans.map((plan) => {
          const name = pickLocalized(plan.name, locale) || plan.code;
          const promotion = promotionOf(plan);
          const price = planPrice({ ...plan, promotion }, interval);
          const isCurrent =
            plan.code === currentPlan && interval === currentInterval;
          const checked = plan.code === selected;
          const unavailable = price.isFree;
          return (
            <button
              key={plan.code}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={unavailable || pending}
              onClick={() => setSelected(plan.code)}
              className={cn(
                "focus-visible:ring-ring/50 flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 disabled:opacity-50",
                checked
                  ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                  : "hover:bg-muted/50",
              )}
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {name}
                  {isCurrent && (
                    <Badge variant="secondary">{t("current")}</Badge>
                  )}
                  {promotion && (
                    <Badge className="bg-amber-500/15 text-amber-900 dark:text-amber-200">
                      {tPricing("promotion.off", {
                        percent: promotion.discount_percent,
                      })}
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-sm">
                  {pickLocalized(plan.description, locale)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {unavailable ? (
                  <span className="text-muted-foreground text-sm">
                    {t("notAvailable")}
                  </span>
                ) : (
                  <>
                    {price.originalCents !== null && (
                      <s className="text-muted-foreground block text-xs">
                        {formatMoney(
                          price.originalCents,
                          plan.currency,
                          locale,
                        )}
                      </s>
                    )}
                    <span className="block font-semibold tabular-nums">
                      {formatMoney(price.cents, plan.currency, locale)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {tPricing(`per.${interval}`)}
                    </span>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
        {mode === "checkout" ? (
          <>
            {carriesTrial && trialEnd && (
              <li>
                {t("trialCarries", {
                  date: formatApiDate(trialEnd.toISOString(), locale),
                })}
              </li>
            )}
            {chosen && promotionOf(chosen) && (
              <li>
                {t("promotionFirstCharge", {
                  percent: promotionOf(chosen)?.discount_percent ?? 0,
                })}
              </li>
            )}
            <li>{t("renews")}</li>
            <li>{t("stripeNote")}</li>
          </>
        ) : (
          <>
            <li>{t("prorated")}</li>
            <li>{t("declinedKeeps")}</li>
          </>
        )}
      </ul>

      <DialogFooter>
        <Button variant="outline" onClick={close} disabled={pending}>
          {t("cancel")}
        </Button>
        <Button onClick={confirm} disabled={!chosen || pending || unchanged}>
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : mode === "checkout" ? (
            <ExternalLink className="mr-2 size-4" />
          ) : (
            <ArrowLeftRight className="mr-2 size-4" />
          )}
          {mode === "checkout" ? t("continue") : t("confirmChange")}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------
// Back from Stripe Checkout
// ---------------------------------------------------------------------

/** Polls for the webhook for about half a minute. */
const POLL_EVERY_MS = 3000;
const POLL_ATTEMPTS = 10;

/**
 * Handles `?checkout=success|canceled` on the way back from Stripe: says
 * what happened, drops the parameter from the address, and refreshes until
 * the webhook has turned the purchase into the account's plan.
 */
export function CheckoutReturn({
  status,
  activated,
}: {
  status: "success" | "canceled" | null;
  activated: boolean;
}) {
  const t = useTranslations("billing.checkout");
  const router = useAppRouter();
  const handled = useRef(false);
  const announced = useRef(false);
  // Waiting for the webhook: back from a payment that isn't mirrored yet.
  const [polling] = useState(() => status === "success" && !activated);
  const [attempt, setAttempt] = useState(0);
  const waiting = polling && !activated && attempt < POLL_ATTEMPTS;

  useEffect(() => {
    if (!status || handled.current) return;
    handled.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState(window.history.state, "", url.toString());
    if (status === "canceled") toast.info(t("returnCanceled"));
  }, [status, t]);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => {
      router.refresh();
      setAttempt((n) => n + 1);
    }, POLL_EVERY_MS);
    return () => window.clearTimeout(timer);
  }, [waiting, attempt, router]);

  useEffect(() => {
    if (status !== "success" || announced.current) return;
    if (activated) {
      announced.current = true;
      toast.success(t("returnActive"));
    } else if (attempt >= POLL_ATTEMPTS) {
      announced.current = true;
      toast.info(t("returnSlow"));
    }
  }, [status, activated, attempt, t]);

  if (!waiting) return null;
  return (
    <Alert variant="info" role="status">
      <Loader2 className="animate-spin" />
      <AlertDescription>{t("returnWaiting")}</AlertDescription>
    </Alert>
  );
}
