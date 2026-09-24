"use server";

import { getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, type ActionResult } from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import type { BillingInterval } from "@/lib/pricing";
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

/**
 * The account's billing state, on its own: what the page polls while it
 * waits for a payment's webhook, instead of re-rendering the whole
 * settings page every few seconds.
 */
export async function getBillingState(): Promise<ActionResult<BillingMe>> {
  return guardedAction(() => fetchServerApi<BillingMe>("/billing/me"));
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

// ---------------------------------------------------------------------
// Card payments (Stripe)
// ---------------------------------------------------------------------

/** Where the browser goes next (Stripe Checkout or the billing portal). */
export interface RedirectTarget {
  url: string;
}

const INTERVALS: readonly BillingInterval[] = ["monthly", "yearly"];

function planChoice(
  planCode: string,
  interval: string,
): { plan_code: string; interval: BillingInterval } | null {
  const code = (planCode ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,32}$/.test(code)) return null;
  if (!(INTERVALS as readonly string[]).includes(interval)) return null;
  return { plan_code: code, interval: interval as BillingInterval };
}

/**
 * Only ever send the browser to one of Stripe's own https pages. (A Stripe
 * custom domain for Checkout, if one is ever set up, must be added here.)
 */
function safeRedirect(target: RedirectTarget): RedirectTarget {
  const url = new URL(target.url);
  const stripeHost =
    url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com");
  if (url.protocol !== "https:" || !stripeHost) {
    throw new Error("Unexpected redirect");
  }
  return { url: url.toString() };
}

/** Opens a Stripe Checkout page for `planCode` billed every `interval`. */
export async function startCheckout(
  planCode: string,
  interval: string,
): Promise<ActionResult<RedirectTarget>> {
  const choice = planChoice(planCode, interval);
  if (!choice) return invalid();
  return guardedAction(async () =>
    safeRedirect(
      await fetchServerApi<RedirectTarget>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify(choice),
      }),
    ),
  );
}

/**
 * Moves the running paid subscription to another plan or interval. The
 * difference is charged (or credited) right away; a declined card leaves
 * the plan as it was.
 */
export async function changePaidPlan(
  planCode: string,
  interval: string,
): Promise<ActionResult<BillingMe>> {
  const choice = planChoice(planCode, interval);
  if (!choice) return invalid();
  const result = await guardedAction(
    () =>
      fetchServerApi<BillingMe>("/billing/subscription/change", {
        method: "POST",
        body: JSON.stringify(choice),
      }),
    () => revalidateDashboard("", "layout"),
  );
  // The bank wants the customer to confirm the charge (3-D Secure): the
  // API answers PAYMENT_ACTION_REQUIRED with Stripe's hosted invoice page,
  // where the browser is sent next. Only a Stripe https page is passed on.
  if (!result.success && result.apiCode === PAYMENT_ACTION_REQUIRED) {
    const raw = result.meta?.hosted_invoice_url;
    let url: string | null = null;
    try {
      url = typeof raw === "string" ? safeRedirect({ url: raw }).url : null;
    } catch {
      url = null;
    }
    return {
      ...result,
      meta: url ? { hosted_invoice_url: url } : undefined,
    };
  }
  return result;
}

const PAYMENT_ACTION_REQUIRED = "PAYMENT_ACTION_REQUIRED";

/** Opens the Stripe billing portal (card, invoices, cancellation). */
export async function openBillingPortal(): Promise<
  ActionResult<RedirectTarget>
> {
  return guardedAction(async () =>
    safeRedirect(
      await fetchServerApi<RedirectTarget>("/billing/portal", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    ),
  );
}

/** What `POST /billing/withdraw` answers (CONTRACTS §3). */
export interface WithdrawalResult {
  refunded_cents: number;
  currency: string;
}

/**
 * Exercises the 7-day withdrawal right (CDC art. 49): the API cancels the
 * paid subscription immediately and refunds what was paid in the window.
 * Refused with `WITHDRAWAL_NOT_ELIGIBLE` once the window has closed.
 */
export async function withdrawSubscription(): Promise<
  ActionResult<WithdrawalResult>
> {
  return guardedAction(
    () =>
      fetchServerApi<WithdrawalResult>("/billing/withdraw", {
        method: "POST",
        body: JSON.stringify({}),
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
