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

export async function getTimeseriesMetrics(
  days: number = 30,
): Promise<TimeseriesResponse | null> {
  try {
    return await fetchServerApi<TimeseriesResponse>(
      `/metrics/timeseries?days=${days}`,
    );
  } catch (error) {
    console.error("Failed to fetch timeseries metrics", error);
    return null;
  }
}
