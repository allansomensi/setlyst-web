import { staticTitle } from "@/lib/page-metadata";
import { getTranslations } from "next-intl/server";
import { getDashboardMetrics, getTimeseriesMetrics } from "../actions";
import { AnalyticsDashboard } from "./_components/analytics-dashboard";

const DEFAULT_DAYS = 30;

export async function generateMetadata() {
  return staticTitle("analytics");
}

export default async function AnalyticsPage() {
  const t = await getTranslations("analytics");

  const [metrics, timeseries] = await Promise.all([
    getDashboardMetrics(),
    getTimeseriesMetrics(DEFAULT_DAYS),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <AnalyticsDashboard
        metrics={metrics}
        initialTimeseries={timeseries}
        initialDays={DEFAULT_DAYS}
      />
    </div>
  );
}
