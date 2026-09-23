import "server-only";

import { cache } from "react";
import { fetchServerApi } from "@/lib/api-server";
import type { BillingMe } from "@/types/billing";
import type { PlanFeature } from "@/types/public";

/**
 * The caller's plan, subscription and effective feature flags
 * (`GET /billing/me`), fetched at most once per request.
 *
 * Returns `null` when the API can't be reached: callers must then treat
 * features as available and let the API be the one to refuse (it always
 * enforces plans server-side), so a transient failure never hides a
 * feature the person is entitled to.
 */
export const getEntitlements = cache(async (): Promise<BillingMe | null> => {
  try {
    return await fetchServerApi<BillingMe>("/billing/me");
  } catch {
    return null;
  }
});

/**
 * Whether the caller may use `feature`. Unknown (API unreachable) counts
 * as allowed; see `getEntitlements`.
 */
export function hasFeature(
  entitlements: BillingMe | null,
  feature: PlanFeature,
): boolean {
  if (!entitlements || !entitlements.enforced) return true;
  return entitlements.features[feature] === true;
}
