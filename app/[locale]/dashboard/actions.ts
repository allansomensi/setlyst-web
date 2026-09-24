"use server";

import { fetchServerApi } from "@/lib/api-server";
import { MetricsResponse, TimeseriesResponse } from "@/types/api";

export async function getDashboardMetrics(): Promise<MetricsResponse | null> {
  try {
    return await fetchServerApi<MetricsResponse>("/metrics");
  } catch (error) {
    console.error("Failed to fetch dashboard metrics", error);
    return null;
  }
}

/** A whole number of days in 1..365; anything else is the default 30. */
function metricsDays(value: unknown): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 365
    ? value
    : 30;
}

export async function getTimeseriesMetrics(
  days: number = 30,
): Promise<TimeseriesResponse | null> {
  const query = new URLSearchParams({ days: String(metricsDays(days)) });
  try {
    return await fetchServerApi<TimeseriesResponse>(
      `/metrics/timeseries?${query}`,
    );
  } catch (error) {
    console.error("Failed to fetch timeseries metrics", error);
    return null;
  }
}
