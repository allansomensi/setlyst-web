"use client";

import { useId } from "react";
import { useLocale } from "next-intl";
import { TimeseriesPoint } from "@/types/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

interface ActivityChartProps {
  title: string;
  description?: string;
  data: TimeseriesPoint[];
  color?: string;
  label: string;
}

export function ActivityChart({
  title,
  description,
  data,
  color = "var(--chart-1)",
  label,
}: ActivityChartProps) {
  const locale = useLocale();
  const gradientId = useId();

  const chartConfig = {
    count: {
      label,
      color,
    },
  } satisfies ChartConfig;

  const total = data.reduce((sum, p) => sum + p.count, 0);

  const formatDate = (value: string) => {
    // `value` is a plain "YYYY-MM-DD" string from the backend; parsing it
    // as UTC and formatting in that same zone avoids off-by-one-day shifts
    // that a local-timezone Date parse could introduce near midnight.
    const date = new Date(`${value}T00:00:00Z`);
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <span className="text-2xl font-bold tabular-nums">{total}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 12, top: 8 }}
          >
            <defs>
              <linearGradient
                id={`fill-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-muted"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDate}
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => formatDate(v as string)}
                />
              }
            />
            <Area
              dataKey="count"
              type="monotone"
              fill={`url(#fill-${gradientId})`}
              stroke={color}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
