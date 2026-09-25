import "server-only";

import { cache } from "react";
import { getMyBilling } from "@/lib/server-data";
import type { BillingMe } from "@/types/billing";
import type { PlanFeature } from "@/types/public";

/**
 * The caller's plan, subscription and effective feature flags
 * (`GET /billing/me`), fetched at most once per request (the same
 * request the dashboard layout makes through getMyBilling).
 *
 * Returns `null` when the API can't be reached: callers must then treat
 * features as available and let the API be the one to refuse (it always
 * enforces plans server-side), so a transient failure never hides a
 * feature the person is entitled to.
 */
export const getEntitlements = cache(async (): Promise<BillingMe | null> => {
  try {
    return await getMyBilling();
  } catch {
    return null;
  }
});

/**
 * Whether the caller may use `feature`, as the API resolved it (beta,
 * plan, free tier, unverified e-mail or staff). Unknown (API unreachable,
 * or a flag the API doesn't send) counts as allowed while plans aren't
 * enforced; see `getEntitlements`.
 */
export function hasFeature(
  entitlements: BillingMe | null,
  feature: PlanFeature,
): boolean {
  if (!entitlements) return true;
  const flag = entitlements.features[feature];
  return typeof flag === "boolean" ? flag : !entitlements.enforced;
}
