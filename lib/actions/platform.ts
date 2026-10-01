"use server";

import { updateTag } from "next/cache";
import { fetchPublicApi } from "@/lib/public-api";
import { PLATFORM_STATUS_TAG, parsePlatformStatus } from "@/lib/maintenance";
import type { MaintenanceMode } from "@/types/operations";

/**
 * The maintenance mode in force right now (uncached), for error
 * boundaries to tell a page refused by maintenance switched on
 * mid-session from a real crash. `null` when the API can't be reached.
 */
export async function getCurrentMaintenanceMode(): Promise<MaintenanceMode | null> {
  // On behalf of the visitor: counted against their address by the API's
  // rate limiter, not against this server's.
  const result = await fetchPublicApi<unknown>("/public/platform", {
    forwardClientIp: true,
  });
  const mode = result.ok
    ? (parsePlatformStatus(result.data)?.maintenance.mode ?? null)
    : null;
  // The layouts read a cached copy (refreshed every 15 s, and at once
  // only on the server where staff saved it): expire it here so the
  // refresh that follows shows the maintenance screen.
  if (mode === "full") updateTag(PLATFORM_STATUS_TAG);
  return mode;
}
