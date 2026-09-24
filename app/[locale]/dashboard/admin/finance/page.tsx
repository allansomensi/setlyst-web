import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { fetchServerApi } from "@/lib/api-server";
import { pickLocalized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import { requireStaffPage } from "@/lib/staff-guard";
import { getPlanOptions } from "@/lib/staff-data";
import { cn } from "@/lib/utils";
import type { FinanceOverview } from "@/types/finance";
import { RevenueChart } from "./_components/revenue-chart";
import { SyncButton } from "./_components/sync-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("finance");
  return { title: t("title") };
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
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

export default async function FinancePage() {
  await requireStaffPage("finance");
  const t = await getTranslations("finance");
  const locale = await getLocale();

  const [data, planOptions] = await Promise.all([
    fetchServerApi<FinanceOverview>("/admin/finance").catch(() => null),
    getPlanOptions(),
  ]);

  const header = (
    <AdminPageHeader
      title={t("title")}
      description={t("description")}
      actions={<SyncButton disabled={data ? !data.payments_enabled : true} />}
    />
  );
  if (!data) {
    return (
      <>
        {header}
        <LoadErrorNotice />
      </>
    );
  }

  const money = (cents: number) => formatMoney(cents, data.currency, locale);
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const planName = (code: string | null) => {
    if (!code) return "—";
    const plan = planOptions.find((p) => p.code === code);
    return plan ? pickLocalized(plan.name, locale) || code : code;
  };
  const intervalLabel = (interval: string | null) =>
    interval === "yearly"
      ? t("interval.yearly")
      : interval === "monthly"
        ? t("interval.monthly")
        : "—";

  const { revenue } = data;
  const monthsNewestFirst = [...data.monthly].reverse();

  return (
    <>
      {header}

      {!data.payments_enabled && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>{t("alerts.paymentsOff")}</AlertDescription>
        </Alert>
      )}
      {!data.enforced && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>{t("alerts.notEnforced")}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="finance-recurring" className="space-y-3">
        <h2 id="finance-recurring" className="sr-only">
          {t("kpi.sectionRecurring")}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label={t("kpi.mrr")}
            value={money(data.mrr_cents)}
            hint={t("kpi.arr", { value: money(data.arr_cents) })}
          />
          <Kpi
            label={t("kpi.thisMonth")}
            value={money(revenue.this_month_cents)}
            // A month in progress against a whole one: shown side by side
            // rather than as a percentage, which would always look like a
            // drop early in the month.
            hint={t("kpi.lastMonth", {
              value: money(revenue.last_month_cents),
            })}
          />
          <Kpi
            label={t("kpi.paying")}
            value={number.format(data.paying_subscribers)}
            hint={t("kpi.arpu", { value: money(data.arpu_cents) })}
          />
          <Kpi
            label={t("kpi.trialing")}
            value={number.format(data.trialing)}
            hint={t("kpi.trialsEnding", { count: data.trials_ending_7_days })}
          />
          <Kpi
            label={t("kpi.newThisMonth")}
            value={number.format(data.new_subscribers_this_month)}
          />
          <Kpi
            label={t("kpi.churnThisMonth")}
            value={number.format(data.churned_this_month)}
            hint={t("kpi.churnRate", {
              rate: percent.format(data.churn_rate_this_month),
            })}
          />
          <Kpi
            label={t("kpi.conversion")}
            value={
              data.trial_conversion.ended_trials > 0
                ? percent.format(data.trial_conversion.rate)
                : "—"
            }
            hint={t("kpi.conversionHint", {
              converted: data.trial_conversion.converted,
              ended: data.trial_conversion.ended_trials,
              days: data.trial_conversion.window_days,
            })}
          />
          <Kpi
            label={t("kpi.attention")}
            value={number.format(data.past_due)}
            tone={
              data.past_due > 0
                ? "text-amber-600 dark:text-amber-400"
                : undefined
            }
            hint={t("kpi.attentionHint", { count: data.cancel_scheduled })}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("chart.title")}</CardTitle>
          <CardDescription>
            {t("chart.description", {
              total: money(revenue.last_12_months_cents),
              allTime: money(revenue.all_time_cents),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RevenueChart data={data.monthly} currency={data.currency} />
          <details className="group">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
              {t("chart.showTable")}
            </summary>
            <div className="mt-3 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.month")}</TableHead>
                    <TableHead className="text-right">
                      {t("chart.gross")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("chart.refunded")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("chart.net")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("chart.payments")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("table.new")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("table.churned")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthsNewestFirst.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(m.gross_cents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.refunded_cents > 0
                          ? `−${money(m.refunded_cents)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {money(m.net_cents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {number.format(m.payments)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {number.format(m.new_subscribers)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {number.format(m.churned)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("byPlan.title")}</CardTitle>
            <CardDescription>{t("byPlan.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.by_plan.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("byPlan.empty")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.plan")}</TableHead>
                    <TableHead className="text-right">
                      {t("table.subscribers")}
                    </TableHead>
                    <TableHead className="text-right">{t("kpi.mrr")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_plan.map((row) => (
                    <TableRow key={`${row.plan_code}-${row.interval}`}>
                      <TableCell>
                        <span className="font-medium">
                          {planName(row.plan_code)}
                        </span>{" "}
                        <span className="text-muted-foreground text-xs">
                          {intervalLabel(row.interval)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {number.format(row.subscribers)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.mrr_cents)}
                        {data.mrr_cents > 0 && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({percent.format(row.mrr_cents / data.mrr_cents)})
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("recent.title")}</CardTitle>
            <CardDescription>
              {data.last_payment_at
                ? t.rich("recent.lastPayment", {
                    date: () => (
                      <ClientDate
                        value={data.last_payment_at}
                        options={{ dateStyle: "medium", timeStyle: "short" }}
                      />
                    ),
                  })
                : t("recent.none")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent_payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("recent.empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.date")}</TableHead>
                      <TableHead>{t("table.account")}</TableHead>
                      <TableHead>{t("table.plan")}</TableHead>
                      <TableHead className="text-right">
                        {t("table.amount")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent_payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap">
                          <ClientDate
                            value={p.paid_at}
                            options={{ dateStyle: "short" }}
                          />
                        </TableCell>
                        <TableCell>
                          {p.user_id && p.username ? (
                            <Link
                              href={`/dashboard/users/${p.user_id}`}
                              className="hover:underline"
                            >
                              @{p.username}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground italic">
                              {t("recent.deletedAccount")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {planName(p.plan_code)}{" "}
                          <span className="text-muted-foreground text-xs">
                            {intervalLabel(p.interval)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          {formatMoney(p.amount_cents, p.currency, locale)}
                          {p.refunded_cents > 0 && (
                            <Badge variant="outline" className="ml-2">
                              {p.refunded_cents >= p.amount_cents
                                ? t("recent.refunded")
                                : t("recent.partiallyRefunded", {
                                    value: formatMoney(
                                      p.refunded_cents,
                                      p.currency,
                                      locale,
                                    ),
                                  })}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        {t("footnote", { timeZone: data.time_zone })}
      </p>
    </>
  );
}
