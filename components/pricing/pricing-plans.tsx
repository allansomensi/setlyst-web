"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Check, Sparkles, Tag } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pickLocalized } from "@/lib/localized";
import {
  isPromotionActive,
  isUnlimited,
  maxYearlySavings,
  planPrice,
  yearlySavingsPercent,
  type BillingInterval,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { PlanFeature, PublicPlan } from "@/types/public";
import { formatMoney } from "@/lib/money";
import { parseApiTimestamp } from "@/lib/dates";

/** Features called out on the cards (the table lists all of them). */
const CARD_FEATURES: PlanFeature[] = [
  "create_bands",
  "tours",
  "advanced_pdf",
  "analytics_export",
  "priority_support",
];

export function IntervalToggle({
  value,
  onChange,
  savings,
}: {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
  savings: number;
}) {
  const t = useTranslations("pricing");
  const options: BillingInterval[] = ["monthly", "yearly"];
  return (
    <div
      role="group"
      aria-label={t("intervalLabel")}
      className="bg-muted inline-flex items-center rounded-xl p-1"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "focus-visible:ring-ring/50 flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3",
            value === option
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`interval.${option}`)}
          {option === "yearly" && savings > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {t("saveUpTo", { percent: savings })}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Plan cards with the monthly / yearly toggle. Prices come from
 * `GET /public/plans`; promotions show the discounted price with the
 * original struck through.
 */
export function PricingPlans({
  plans,
  signedIn,
}: {
  plans: PublicPlan[];
  /**
   * Whether the visitor has a session (lib/site-session.ts, from a server
   * page). When not given, the client session decides, so the page itself
   * can stay static.
   */
  signedIn?: boolean;
}) {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const { status } = useSession();
  const hasSession = signedIn ?? status === "authenticated";
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const savings = maxYearlySavings(plans);
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-10">
      <div className="flex justify-center">
        <IntervalToggle
          value={interval}
          onChange={setInterval}
          savings={savings}
        />
      </div>

      <ul
        className={cn(
          "grid gap-6",
          plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2",
        )}
      >
        {plans.map((plan) => {
          const name = pickLocalized(plan.name, locale) || plan.code;
          const promotion =
            plan.promotion && isPromotionActive(plan.promotion.ends_at)
              ? plan.promotion
              : null;
          const price = planPrice({ ...plan, promotion }, interval);
          const yearlySaving = yearlySavingsPercent(
            plan.price_monthly_cents,
            plan.price_yearly_cents,
          );
          const limit = (key: string) => plan.limits[key] ?? 0;
          // `unlimited` picks the wording, `count` the plural form.
          const count = (key: string) => ({
            unlimited: isUnlimited(limit(key)) ? "true" : "false",
            count: limit(key),
          });

          const highlights = [
            t("card.songs", count("songs")),
            t("card.setlists", count("setlists")),
            limit("bands_owned") > 0
              ? t("card.bandsOwned", count("bands_owned"))
              : t("card.bandMemberships", count("band_memberships")),
            ...CARD_FEATURES.filter((f) => plan.features[f]).map((f) =>
              t(`features.${f}`),
            ),
          ];

          return (
            <li
              key={plan.code}
              className={cn(
                "bg-card relative flex flex-col rounded-2xl border p-6 shadow-xs sm:p-7",
                plan.highlighted &&
                  "border-primary/60 ring-primary/15 shadow-primary/5 shadow-lg ring-4",
              )}
            >
              <div className="flex min-h-7 flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
                {plan.highlighted && (
                  <Badge className="h-6 gap-1 px-2.5">
                    <Sparkles />
                    {t("recommended")}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2 min-h-12 text-sm leading-relaxed">
                {pickLocalized(plan.description, locale)}
              </p>

              {promotion && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                  <Tag className="size-4 shrink-0" />
                  <span className="font-semibold">
                    {t("promotion.off", {
                      percent: promotion.discount_percent,
                    })}
                  </span>
                  {pickLocalized(promotion.headline, locale) && (
                    <span>{pickLocalized(promotion.headline, locale)}</span>
                  )}
                  <span className="text-amber-900/80 dark:text-amber-200/80">
                    {t("promotion.until", {
                      date: dateFormat.format(
                        parseApiTimestamp(promotion.ends_at),
                      ),
                    })}
                  </span>
                </div>
              )}

              <div className="mt-6">
                {price.isFree ? (
                  <p className="text-4xl font-bold tracking-tight">
                    {t("free")}
                  </p>
                ) : (
                  <>
                    {price.originalCents !== null && (
                      <p className="text-muted-foreground text-sm">
                        <span className="sr-only">{t("originalPrice")} </span>
                        <s>
                          {formatMoney(
                            price.originalCents,
                            plan.currency,
                            locale,
                          )}
                        </s>
                      </p>
                    )}
                    <p className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight tabular-nums">
                        {formatMoney(price.cents, plan.currency, locale)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {t(`per.${interval}`)}
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1 min-h-5 text-sm">
                      {interval === "yearly" && price.perMonthCents !== null
                        ? t("equivalentMonthly", {
                            amount: formatMoney(
                              price.perMonthCents,
                              plan.currency,
                              locale,
                            ),
                          }) +
                          (yearlySaving > 0
                            ? ` · ${t("savePercent", { percent: yearlySaving })}`
                            : "")
                        : t("billedMonthly")}
                    </p>
                  </>
                )}
              </div>

              <Button
                asChild
                size="lg"
                variant={plan.highlighted ? "default" : "outline"}
                className="mt-6 h-10 w-full"
              >
                <Link
                  // Signed in: straight to the plan picker in Settings, with
                  // this plan and interval preselected (see PaidPlanActions).
                  // Sending an account holder to /register only bounced them
                  // to the dashboard and lost the choice.
                  href={
                    hasSession
                      ? {
                          pathname: "/dashboard/settings",
                          query: {
                            section: "subscription",
                            plan: plan.code,
                            interval,
                          },
                        }
                      : {
                          pathname: "/register",
                          query: { plan: plan.code, interval },
                        }
                  }
                >
                  {t("cta", { plan: name })}
                </Link>
              </Button>

              <ul className="mt-6 space-y-2.5 border-t pt-6 text-sm">
                {highlights.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
