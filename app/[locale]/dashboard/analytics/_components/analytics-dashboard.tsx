"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MetricsResponse, TimeseriesResponse } from "@/types/api";
import { getTimeseriesMetrics } from "@/app/[locale]/dashboard/actions";
import { ActivityChart } from "./activity-chart";
import { UserMetricsCharts } from "@/app/[locale]/dashboard/_components/user-metrics";
import { AdminMetricsCharts } from "@/app/[locale]/dashboard/_components/admin-metrics";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [7, 30, 90] as const;

interface AnalyticsDashboardProps {
  metrics: MetricsResponse | null;
  initialTimeseries: TimeseriesResponse | null;
  initialDays: number;
}

export function AnalyticsDashboard({
  metrics,
  initialTimeseries,
  initialDays,
}: AnalyticsDashboardProps) {
  const t = useTranslations("analytics");
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState(initialDays);
  const [timeseries, setTimeseries] = useState(initialTimeseries);

  const handleRangeChange = (value: number) => {
    setDays(value);
    startTransition(async () => {
      const result = await getTimeseriesMetrics(value);
      setTimeseries(result);
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("activity.title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("activity.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option}
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleRangeChange(option)}
              className={cn("h-8", days === option && "bg-muted font-medium")}
            >
              {t("activity.rangeDays", { count: option })}
            </Button>
          ))}
        </div>
      </div>

      {timeseries && timeseries.scope === "admin" && (
        <div className="grid gap-4 md:grid-cols-2">
          <ActivityChart
            title={t("activity.newUsers")}
            label={t("activity.newUsers")}
            data={timeseries.users_registered}
            color="var(--chart-1)"
          />
          <ActivityChart
            title={t("activity.newSongs")}
            label={t("activity.newSongs")}
            data={timeseries.songs_created}
            color="var(--chart-2)"
          />
          <ActivityChart
            title={t("activity.newSetlists")}
            label={t("activity.newSetlists")}
            data={timeseries.setlists_created}
            color="var(--chart-3)"
          />
          <ActivityChart
            title={t("activity.newBands")}
            label={t("activity.newBands")}
            data={timeseries.bands_created}
            color="var(--chart-4)"
          />
        </div>
      )}

      {timeseries && timeseries.scope === "user" && (
        <div className="grid gap-4 md:grid-cols-3">
          <ActivityChart
            title={t("activity.mySongs")}
            label={t("activity.mySongs")}
            data={timeseries.songs_created}
            color="var(--chart-1)"
          />
          <ActivityChart
            title={t("activity.mySetlists")}
            label={t("activity.mySetlists")}
            data={timeseries.setlists_created}
            color="var(--chart-2)"
          />
          <ActivityChart
            title={t("activity.myGigs")}
            label={t("activity.myGigs")}
            data={timeseries.gigs_created}
            color="var(--chart-3)"
          />
        </div>
      )}

      <Separator />

      <div>
        <h2 className="text-lg font-semibold">{t("overview.title")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("overview.subtitle")}
        </p>
      </div>

      {metrics && metrics.scope === "admin" && (
        <AdminMetricsCharts data={metrics} />
      )}
      {metrics && metrics.scope === "user" && (
        <UserMetricsCharts data={metrics} />
      )}
    </div>
  );
}
