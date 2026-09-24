"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/money";
import type { MonthRevenue } from "@/types/finance";

function monthLabel(month: string, locale: string, style: "short" | "long") {
  const [year, m] = month.split("-").map(Number);
  // Mid-month UTC: the label never slips to a neighbouring month.
  const date = new Date(Date.UTC(year, (m ?? 1) - 1, 15));
  return new Intl.DateTimeFormat(locale, {
    month: style,
    year: style === "long" ? "numeric" : "2-digit",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Net revenue (after refunds) per month, one series: no legend, the card
 * title names it. The tooltip carries the month's detail; the table below
 * the chart is its accessible view.
 */
export function RevenueChart({
  data,
  currency,
}: {
  data: MonthRevenue[];
  currency: string;
}) {
  const t = useTranslations("finance.chart");
  const locale = useLocale();
  const config = {
    net: { label: t("net"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const rows = data.map((m) => ({
    ...m,
    net: m.net_cents / 100,
    label: monthLabel(m.month, locale, "short"),
  }));
  const money = (cents: number) =>
    formatMoney(cents, currency, locale, { compact: true });

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={72}
          tickFormatter={(value: number) => money(Math.round(value * 100))}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.15 }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as
              (MonthRevenue & { label: string }) | undefined;
            if (!active || !row) return null;
            return (
              <div className="bg-popover text-popover-foreground grid min-w-44 gap-1 rounded-lg border px-3 py-2 text-xs shadow-md">
                <p className="font-medium">
                  {monthLabel(row.month, locale, "long")}
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("net")}</span>
                  <span className="font-medium tabular-nums">
                    {money(row.net_cents)}
                  </span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("gross")}</span>
                  <span className="tabular-nums">{money(row.gross_cents)}</span>
                </p>
                {row.refunded_cents > 0 && (
                  <p className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {t("refunded")}
                    </span>
                    <span className="tabular-nums">
                      −{money(row.refunded_cents)}
                    </span>
                  </p>
                )}
                <p className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("payments")}</span>
                  <span className="tabular-nums">{row.payments}</span>
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="net"
          fill="var(--color-net)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ChartContainer>
  );
}
