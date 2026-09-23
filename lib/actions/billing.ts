"use server";

import { getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, type ActionResult } from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import type { BillingMe } from "@/types/billing";
import type {
  CreditEntry,
  ReferralEntry,
  RedemptionSummary,
} from "@/types/account";
import type { PaginatedResponse } from "@/types/api";

/**
 * The signed-in account's subscription side: promo codes, credit rewards
 * and the credit / referral history lists.
 */

async function invalid<T>(): Promise<ActionResult<T>> {
  const t = await getTranslations("apiErrors");
  return { success: false, error: t("rejected") };
}

export type RedeemResult = BillingMe & { redemption: RedemptionSummary };

/** Redeems a promo code; answers the new billing state and what it did. */
export async function redeemPromoCode(
  code: string,
): Promise<ActionResult<RedeemResult>> {
  const clean = (code ?? "").trim().toUpperCase();
  if (!clean || clean.length > 40 || !/^[A-Z0-9_-]+$/.test(clean)) {
    return invalid();
  }
  return guardedAction(
    () =>
      fetchServerApi<RedeemResult>("/billing/redeem", {
        method: "POST",
        body: JSON.stringify({ code: clean }),
      }),
    () => revalidateDashboard("", "layout"),
  );
}

/** Spends credits on a reward from the catalog. */
export async function redeemReward(
  rewardId: string,
): Promise<ActionResult<BillingMe>> {
  const id = (rewardId ?? "").trim();
  if (!id || id.length > 40) return invalid();
  return guardedAction(
    () =>
      fetchServerApi<BillingMe>("/billing/credits/redeem", {
        method: "POST",
        body: JSON.stringify({ reward_id: id }),
      }),
    () => revalidateDashboard("", "layout"),
  );
}

function pageOf(page: number): number {
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
}

export async function loadCreditHistory(
  page: number,
): Promise<ActionResult<PaginatedResponse<CreditEntry>>> {
  return guardedAction(() =>
    fetchServerApi<PaginatedResponse<CreditEntry>>(
      `/billing/credits?page=${pageOf(page)}&per_page=10`,
    ),
  );
}

export async function loadReferrals(
  page: number,
): Promise<ActionResult<PaginatedResponse<ReferralEntry>>> {
  return guardedAction(() =>
    fetchServerApi<PaginatedResponse<ReferralEntry>>(
      `/billing/referrals?page=${pageOf(page)}&per_page=10`,
    ),
  );
}
