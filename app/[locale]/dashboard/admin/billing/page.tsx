import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Eye, Pencil, Plus, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/components/nav-link";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { fetchServerApi } from "@/lib/api-server";
import { formatMoney } from "@/lib/money";
import { pickLocalized } from "@/lib/localized";
import { requireStaffPage } from "@/lib/staff-guard";
import { getPlanOptions } from "@/lib/staff-data";
import { cn } from "@/lib/utils";
import type { Plan, SubscriptionStatus } from "@/types/billing";
import type { BillingOverview, BillingSettings } from "@/types/staff";
import { BillingSettingsForm } from "./_components/billing-settings-form";
import { GrantTrialsCard } from "./_components/grant-trials-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billingAdmin");
  return { title: t("title") };
}

const STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
];

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className={cn("text-2xl font-semibold tabular-nums", tone)}>
          {value}
        </p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function BillingAdminPage() {
  const { isAdmin } = await requireStaffPage("billing");
  const t = await getTranslations("billingAdmin");
  const locale = await getLocale();

  const [overview, settings, plans, planOptions] = await Promise.all([
    fetchServerApi<BillingOverview>("/admin/billing/overview").catch(
      () => null,
    ),
    isAdmin
      ? fetchServerApi<BillingSettings>("/admin/billing/settings").catch(
          () => null,
        )
      : Promise.resolve(null),
    fetchServerApi<Plan[]>("/admin/plans").catch(() => null),
    getPlanOptions(),
  ]);
  const sortedPlans = plans
    ? [...plans].sort((a, b) => a.sort_order - b.sort_order)
    : null;
  const planName = (code: string) => {
    const plan =
      plans?.find((p) => p.code === code) ??
      planOptions.find((p) => p.code === code);
    return plan ? pickLocalized(plan.name, locale) || code : code;
  };
  const number = new Intl.NumberFormat(locale);

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />

      {!isAdmin && (
        <Alert>
          <Eye className="size-4" />
          <AlertDescription>{t("readOnly")}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="billing-overview" className="space-y-3">
        <h2 id="billing-overview" className="text-lg font-semibold">
          {t("overview.title")}
        </h2>
        {overview === null ? (
          <LoadErrorNotice />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric
                label={t("overview.enforcement")}
                value={
                  overview.enforced
                    ? t("overview.enforcedOn")
                    : t("overview.enforcedOff")
                }
                tone={
                  overview.enforced
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }
                hint={
                  overview.enforced
                    ? t("overview.enforcedOnHint")
                    : t("overview.enforcedOffHint")
                }
              />
              <Metric
                label={t("overview.withoutSubscription")}
                value={number.format(overview.accounts_without_subscription)}
              />
              <Metric
                label={t("overview.credits")}
                value={number.format(overview.credits_issued)}
                hint={t("overview.creditsSpent", {
                  count: overview.credits_spent,
                })}
              />
              <Metric
                label={t("overview.redemptions")}
                value={number.format(overview.promo_redemptions_last_30_days)}
                hint={t("overview.referrals", {
                  count: overview.referrals_rewarded,
                })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("overview.byStatus")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                    {STATUSES.map((status) => (
                      <div key={status}>
                        <dt className="text-muted-foreground text-xs">
                          {t(`subscriptionStatus.${status}`)}
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {number.format(overview.by_status[status] ?? 0)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("overview.byPlan")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(overview.by_plan).length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t("overview.noSubscriptions")}
                    </p>
                  ) : (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                      {Object.entries(overview.by_plan).map(([code, count]) => (
                        <div key={code}>
                          <dt className="text-muted-foreground text-xs">
                            {planName(code)}
                          </dt>
                          <dd className="font-semibold tabular-nums">
                            {number.format(count)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="billing-plans" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="billing-plans" className="text-lg font-semibold">
            {t("plans.title")}
          </h2>
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/billing/plans/new">
                <Plus aria-hidden />
                {t("plans.new")}
              </Link>
            </Button>
          )}
        </div>
        {sortedPlans === null ? (
          <LoadErrorNotice />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sortedPlans.map((plan) => (
              <Card
                key={plan.code}
                className={cn(plan.highlighted && "ring-primary/30 ring-2")}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-1.5">
                        {pickLocalized(plan.name, locale) || plan.code}
                        {plan.highlighted && (
                          <Star
                            className="size-3.5 fill-current text-amber-500"
                            aria-label={t("plans.highlighted")}
                          />
                        )}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {plan.code}
                      </CardDescription>
                    </div>
                    <Badge variant={plan.is_public ? "secondary" : "outline"}>
                      {plan.is_public ? t("plans.public") : t("plans.hidden")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    <span className="text-lg font-semibold">
                      {formatMoney(
                        plan.price_monthly_cents,
                        plan.currency,
                        locale,
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      {t("plans.perMonth")}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("plans.yearly", {
                      price: formatMoney(
                        plan.price_yearly_cents,
                        plan.currency,
                        locale,
                      ),
                    })}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("plans.featureCount", {
                      count: Object.values(plan.features).filter(Boolean)
                        .length,
                    })}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Link href={`/dashboard/admin/billing/plans/${plan.code}`}>
                      {isAdmin ? <Pencil aria-hidden /> : <Eye aria-hidden />}
                      {isAdmin ? t("plans.edit") : t("plans.view")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {isAdmin && settings && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <BillingSettingsForm
            initial={settings}
            plans={(sortedPlans ?? []).map((p) => ({
              code: p.code,
              name: pickLocalized(p.name, locale) || p.code,
            }))}
          />
          <GrantTrialsCard
            defaultDays={settings.trial_days || 30}
            withoutSubscription={
              overview?.accounts_without_subscription ?? null
            }
            trialPlan={planName(settings.trial_plan)}
          />
        </div>
      )}
    </>
  );
}
