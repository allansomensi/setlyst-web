"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  Check,
  CreditCard,
  Gauge,
  Info,
  Loader2,
  Minus,
  Sparkles,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/components/nav-link";
import { QuotaUsageList } from "@/components/quota-usage-list";
import { useAppRouter } from "@/hooks/use-app-router";
import { redeemPromoCode } from "@/lib/actions/billing";
import { toastActionError } from "@/lib/action-toast";
import { formatApiDate } from "@/lib/dates";
import { pickLocalized } from "@/lib/localized";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { QuotaReport } from "@/types/api";
import type {
  CreditEntry,
  RedemptionSummary,
  ReferralEntry,
  SubscriptionEvent,
} from "@/types/account";
import type { BillingMe, SubscriptionStatus } from "@/types/billing";
import type { PaginatedResponse } from "@/types/api";
import { PLAN_FEATURES, type PublicPlan } from "@/types/public";
import { CreditsCard, ReferralCard } from "./credits-referrals";
import {
  CheckoutReturn,
  PaidPlanActions,
  isPaidAndLive,
  paymentsAvailable,
} from "./paid-plan";

interface SubscriptionSectionProps {
  billing: BillingMe | null;
  usage: QuotaReport | null;
  history: SubscriptionEvent[] | null;
  credits: PaginatedResponse<CreditEntry> | null;
  referrals: PaginatedResponse<ReferralEntry> | null;
  /** Localized plan names by code (from the public plan list). */
  planNames: Record<string, string>;
  /** Public plans, for choosing one to pay for. */
  plans: PublicPlan[];
  /** `?checkout=` on the way back from Stripe Checkout. */
  checkoutStatus: "success" | "canceled" | null;
  readOnly: boolean;
}

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  trialing: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  past_due: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  canceled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export function SubscriptionSection({
  billing,
  usage,
  history,
  credits,
  referrals,
  planNames,
  plans,
  checkoutStatus,
  readOnly,
}: SubscriptionSectionProps) {
  const t = useTranslations("billing");

  if (!billing) {
    return (
      <Alert variant="warning">
        <TriangleAlert />
        <AlertDescription>{t("unavailable")}</AlertDescription>
      </Alert>
    );
  }

  const planName = (code: string | null | undefined) =>
    code ? (planNames[code] ?? code) : "";

  return (
    <div className="space-y-4">
      <CheckoutReturn
        status={checkoutStatus}
        activated={isPaidAndLive(billing.subscription)}
      />
      <PlanCard
        billing={billing}
        planName={planName}
        history={history}
        plans={plans}
        readOnly={readOnly}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="text-primary size-4" />
            {t("usage.title")}
          </CardTitle>
          <CardDescription>
            {billing.enforced
              ? t("usage.descriptionPlan")
              : t("usage.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usage ? (
            <QuotaUsageList report={usage} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("usage.unavailable")}
            </p>
          )}
        </CardContent>
      </Card>

      <PromoCodeCard planName={planName} disabled={readOnly} />

      <CreditsCard
        // Remounted when the balance moves, so the history reloads too.
        key={billing.credits.balance}
        balance={billing.credits.balance}
        rewards={billing.rewards}
        initialHistory={credits}
        planName={planName}
        disabled={readOnly}
      />

      <ReferralCard referral={billing.referral} initialReferrals={referrals} />
    </div>
  );
}

// ---------------------------------------------------------------------
// Current plan
// ---------------------------------------------------------------------

function PlanCard({
  billing,
  planName,
  history,
  plans,
  readOnly,
}: {
  billing: BillingMe;
  planName: (code: string | null | undefined) => string;
  history: SubscriptionEvent[] | null;
  plans: PublicPlan[];
  readOnly: boolean;
}) {
  const t = useTranslations("billing");
  const tFeatures = useTranslations("pricing.features");
  const locale = useLocale();
  const subscription = billing.subscription;
  const date = (value: string | null) =>
    value ? formatApiDate(value, locale) : null;

  const title = billing.plan
    ? pickLocalized(billing.plan.name, locale) || billing.plan.code
    : subscription
      ? planName(subscription.plan_code)
      : billing.enforced
        ? t("plan.none")
        : t("plan.preRelease");

  const description = billing.plan
    ? pickLocalized(billing.plan.description, locale)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <CreditCard className="text-primary size-4" />
          {t("plan.title")}
        </CardTitle>
        <CardDescription>{t("plan.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="bg-muted/40 rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">{title}</p>
            {subscription && (
              <Badge className={STATUS_STYLES[subscription.status]}>
                {t(`status.${subscription.status}`)}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
          {subscription && (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t("plan.started")}</dt>
                <dd className="font-medium">{date(subscription.started_at)}</dd>
              </div>
              {subscription.status === "trialing" &&
              subscription.trial_ends_at ? (
                <div>
                  <dt className="text-muted-foreground">
                    {t("plan.trialEnds")}
                  </dt>
                  <dd className="font-medium">
                    {date(subscription.trial_ends_at)}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-muted-foreground">
                    {subscription.status === "canceled" ||
                    subscription.status === "expired"
                      ? t("plan.ended")
                      : subscription.cancel_at_period_end
                        ? t("plan.endsOn")
                        : subscription.source === "payment"
                          ? t("plan.nextCharge")
                          : t("plan.renewsOn")}
                  </dt>
                  <dd className="font-medium">
                    {date(subscription.current_period_end) ??
                      t("plan.openEnded")}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">{t("plan.source")}</dt>
                <dd className="font-medium">
                  {t(`source.${subscription.source}`)}
                  {subscription.source === "payment" &&
                    subscription.billing_interval && (
                      <span className="text-muted-foreground font-normal">
                        {" · "}
                        {t(`interval.${subscription.billing_interval}`)}
                      </span>
                    )}
                </dd>
              </div>
            </dl>
          )}
          {!subscription && billing.enforced && (
            <p className="text-muted-foreground mt-2 text-sm">
              {t("plan.noneHint")}
            </p>
          )}
        </div>

        {!billing.enforced && (
          <Alert variant="info">
            <Info />
            <AlertDescription>{t("preRelease")}</AlertDescription>
          </Alert>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">{t("plan.features")}</p>
          <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {PLAN_FEATURES.map((feature) => {
              const on = billing.features[feature] === true;
              return (
                <li key={feature} className="flex items-center gap-2">
                  {on ? (
                    <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Minus className="text-muted-foreground size-4 shrink-0" />
                  )}
                  <span className={cn(!on && "text-muted-foreground")}>
                    {tFeatures(feature)}
                  </span>
                  <span className="sr-only">
                    {on ? t("plan.included") : t("plan.notIncluded")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {history && history.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">{t("history.title")}</p>
            <ol className="space-y-2 border-l pl-4 text-sm">
              {history.slice(0, 6).map((event) => (
                <li key={event.id} className="relative">
                  <span className="bg-primary absolute top-1.5 -left-[1.3rem] size-2 rounded-full" />
                  <p>
                    {t.has(`history.kinds.${event.kind}`)
                      ? t(`history.kinds.${event.kind}`, {
                          plan: planName(event.to_plan ?? event.from_plan),
                        })
                      : t("history.kinds.other")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatApiDate(event.created_at, locale)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
      {paymentsAvailable(billing) ? (
        <CardFooter>
          <PaidPlanActions
            billing={billing}
            plans={plans}
            readOnly={readOnly}
          />
        </CardFooter>
      ) : (
        <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <CalendarClock className="size-4 shrink-0" />
            {t("paymentsSoon")}
          </p>
          <Button asChild variant="outline">
            <Link href="/pricing">
              <Sparkles className="mr-2 size-4" />
              {t("seePlans")}
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------

function PromoCodeCard({
  planName,
  disabled,
}: {
  planName: (code: string | null | undefined) => string;
  disabled: boolean;
}) {
  const t = useTranslations("billing.promo");
  const router = useAppRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState<string | null>(null);

  const describe = (redemption: RedemptionSummary): string => {
    switch (redemption.kind) {
      case "plan_grant":
        return t("granted.plan_grant", {
          days: redemption.days ?? 0,
          plan: planName(redemption.plan_code),
        });
      case "trial_extension":
        return t("granted.trial_extension", { days: redemption.days ?? 0 });
      case "credits":
        return t("granted.credits", { credits: redemption.credits ?? 0 });
      case "discount":
        return t("granted.discount", {
          percent: redemption.discount_percent ?? 0,
        });
      default:
        return t("granted.generic");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = code.trim();
    if (!value || pending) return;
    setPending(true);
    setError(null);
    setGranted(null);
    const result = await redeemPromoCode(value);
    setPending(false);
    if (!result.success || !result.data) {
      if (!result.success && result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.success ? null : result.error);
      return;
    }
    const message = describe(result.data.redemption);
    setGranted(message);
    setCode("");
    toast.success(t("success"));
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="text-primary size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 sm:flex-row"
          noValidate
        >
          <Label htmlFor="promo-code" className="sr-only">
            {t("label")}
          </Label>
          <Input
            id="promo-code"
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9_-]/g, "")
                  .slice(0, 40),
              )
            }
            placeholder={t("placeholder")}
            autoComplete="off"
            spellCheck={false}
            disabled={pending || disabled}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "promo-error" : undefined}
            className="h-10 font-mono tracking-wider uppercase"
          />
          <Button
            type="submit"
            className="h-10"
            disabled={pending || disabled || !code.trim()}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("submit")}
          </Button>
        </form>
        {error && (
          <p
            id="promo-error"
            role="alert"
            className="text-destructive text-sm font-medium"
          >
            {error}
          </p>
        )}
        {granted && (
          <Alert variant="success">
            <Check />
            <AlertDescription>{granted}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
