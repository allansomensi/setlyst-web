"use server";

import { fetchServerApi } from "@/lib/api-server";
import { MetricsResponse } from "@/types/api";

export async function getDashboardMetrics(): Promise<MetricsResponse | null> {
  try {
    return await fetchServerApi<MetricsResponse>("/metrics");
  } catch (error) {
    console.error("Failed to fetch dashboard metrics", error);
    return null;
  }
}
