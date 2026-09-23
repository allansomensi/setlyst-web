import { staticTitle } from "@/lib/page-metadata";
import { getTranslations } from "next-intl/server";
import { fetchAllServerPages, fetchServerApi } from "@/lib/api-server";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import type {
  Artist,
  Gig,
  PaginatedResponse,
  Setlist,
  Song,
} from "@/types/api";
import { getDashboardMetrics, getTimeseriesMetrics } from "../actions";
import { AnalyticsDashboard } from "./_components/analytics-dashboard";

const DEFAULT_DAYS = 30;

export async function generateMetadata() {
  return staticTitle("analytics");
}

export default async function AnalyticsPage() {
  const t = await getTranslations("analytics");

  const [
    metrics,
    timeseries,
    songsRes,
    artistsRes,
    setlistsRes,
    gigsRes,
    entitlements,
  ] = await Promise.all([
    getDashboardMetrics(),
    getTimeseriesMetrics(DEFAULT_DAYS),
    fetchOrFailed(fetchAllServerPages<Song>("/songs")),
    fetchOrFailed(fetchAllServerPages<Artist>("/artists")),
    fetchOrFailed(
      fetchServerApi<PaginatedResponse<Setlist>>("/setlists?per_page=1"),
    ),
    fetchOrFailed(fetchAllServerPages<Gig>("/gigs")),
    getEntitlements(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <AnalyticsDashboard
        title={t("title")}
        subtitle={t("subtitle")}
        metrics={metrics}
        initialTimeseries={timeseries}
        initialDays={DEFAULT_DAYS}
        songs={songsRes === FETCH_FAILED ? [] : songsRes.data}
        artists={artistsRes === FETCH_FAILED ? [] : artistsRes.data}
        setlistCount={
          setlistsRes === FETCH_FAILED ? null : setlistsRes.meta.total_items
        }
        gigs={gigsRes === FETCH_FAILED ? [] : gigsRes.data}
        loadError={songsRes === FETCH_FAILED}
        canExport={hasFeature(entitlements, "analytics_export")}
      />
    </div>
  );
}
