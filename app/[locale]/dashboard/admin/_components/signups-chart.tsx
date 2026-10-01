"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatApiDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ConsoleOverview } from "@/types/operations";

type Day = ConsoleOverview["signups"][number];

/**
 * New accounts per day (UTC days, oldest first), one series: no legend,
 * the card title names it. The card states the total in words, so the
 * chart itself is decorative for screen readers.
 */
export function SignupsChart({ data }: { data: Day[] }) {
  const t = useTranslations("console.chart");
  const locale = useLocale();
  const config = {
    count: { label: t("signups"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const rows = data.map((day) => ({
    ...day,
    label: formatApiDay(day.day, locale, { day: "numeric", month: "short" }),
  }));
  // With no sign-ups at all the axis invents a scale and the bars are
  // invisible: say so over the (still drawn) baseline instead.
  const empty = data.every((day) => day.count === 0);

  return (
    <div className="relative" aria-hidden>
      {empty && (
        <p className="text-muted-foreground pointer-events-none absolute inset-0 z-10 flex items-center justify-center pb-6 text-sm">
          {t("empty")}
        </p>
      )}
      <ChartContainer
        config={config}
        className={cn("aspect-auto h-56 w-full", empty && "opacity-40")}
      >
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.4} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
          />
          <ChartTooltip
            cursor={{ fillOpacity: 0.15 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Day | undefined;
              if (!active || !row) return null;
              return (
                <div className="bg-popover text-popover-foreground grid min-w-36 gap-1 rounded-lg border px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">
                    {formatApiDay(row.day, locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <p className="tabular-nums">
                    {t("tooltip", { count: row.count })}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
