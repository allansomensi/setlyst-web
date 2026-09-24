"use server";

import {
  guardedAction,
  requireStaff,
  invalidRequest,
} from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import type { Plan } from "@/types/billing";
import type {
  AdminSubscriptionView,
  BillingSettings,
  CreatePromoCodePayload,
  PromoCode,
  PromoRedemption,
  Promotion,
  PromotionPayload,
  UpdatePromoCodePayload,
  UpsertPlanPayload,
} from "@/types/staff";
import { isUuid } from "@/lib/uuid";
import {
  REFUND_REASON_MAX,
  REFUND_REASON_MIN,
  type StaffRefundResult,
} from "@/lib/billing-admin";

/**
 * Billing administration: settings, plans, promo codes, promotions and
 * per-account subscriptions and credits. Admin only (the API allows
 * moderators to read the overview and a user's subscription).
 */

const enc = encodeURIComponent;
const PLAN_CODE = /^[a-z][a-z0-9_]{1,31}$/;

function id(value: string): string {
  if (!isUuid(value)) throw new Error("Invalid id");
  return enc(value);
}

function revalidateBilling() {
  revalidateDashboard("/admin/billing", "layout");
}

// ---------------------------------------------------------------- settings

/**
 * `force` switches plans off even while paid subscriptions are live (the
 * API refuses that with `BILLING_HAS_PAID_SUBSCRIPTIONS` otherwise: those
 * customers keep being charged).
 */
export async function saveBillingSettings(
  settings: BillingSettings,
  force = false,
) {
  return guardedAction(async () => {
    await requireStaff(true);
    const query = force === true ? "?force=true" : "";
    return fetchServerApi<BillingSettings>(`/admin/billing/settings${query}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }, revalidateBilling);
}

export async function grantTrials(days: number) {
  return guardedAction(async () => {
    await requireStaff(true);
    const result = await fetchServerApi<{ granted: number }>(
      "/admin/billing/grant-trials",
      { method: "POST", body: JSON.stringify({ days }), timeoutMs: 120_000 },
    );
    return result.granted;
  }, revalidateBilling);
}

// ------------------------------------------------------------------- plans

export async function savePlan(code: string, payload: UpsertPlanPayload) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      if (!PLAN_CODE.test(code)) throw new Error("Invalid plan code");
      return fetchServerApi<Plan>(`/admin/plans/${enc(code)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    () => {
      revalidateBilling();
      revalidateDashboard("/admin/billing/plans/[code]");
    },
  );
}

// ------------------------------------------------------------- promo codes

function revalidatePromoCodes() {
  revalidateDashboard("/admin/promo-codes");
  revalidateBilling();
}

export async function createPromoCode(payload: CreatePromoCodePayload) {
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<PromoCode>("/admin/promo-codes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, revalidatePromoCodes);
}

export async function updatePromoCode(
  promoId: string,
  payload: UpdatePromoCodePayload,
) {
  if (!isUuid(promoId)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<PromoCode>(`/admin/promo-codes/${id(promoId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }, revalidatePromoCodes);
}

export async function getPromoRedemptions(promoId: string) {
  if (!isUuid(promoId)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<PromoRedemption[]>(
      `/admin/promo-codes/${id(promoId)}/redemptions`,
    );
  });
}

// -------------------------------------------------------------- promotions

function revalidatePromotions() {
  revalidateDashboard("/admin/promotions");
}

export async function createPromotion(payload: PromotionPayload) {
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<Promotion>("/admin/promotions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, revalidatePromotions);
}

export async function updatePromotion(
  promotionId: string,
  payload: PromotionPayload,
) {
  if (!isUuid(promotionId)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<Promotion>(`/admin/promotions/${id(promotionId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }, revalidatePromotions);
}

export async function deletePromotion(promotionId: string) {
  if (!isUuid(promotionId)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff(true);
    await fetchServerApi<unknown>(`/admin/promotions/${id(promotionId)}`, {
      method: "DELETE",
    });
  }, revalidatePromotions);
}

// ------------------------------------------------------ user subscriptions

function revalidateUser() {
  revalidateDashboard("/users/[id]");
}

export async function grantUserPlan(
  userId: string,
  payload: { plan_code: string; days: number | null; note: string | null },
) {
  if (!isUuid(userId)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<AdminSubscriptionView>(
      `/admin/users/${id(userId)}/subscription`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
  }, revalidateUser);
}

export async function revokeUserPlan(userId: string) {
  if (!isUuid(userId)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff(true);
    await fetchServerApi<unknown>(`/admin/users/${id(userId)}/subscription`, {
      method: "DELETE",
    });
  }, revalidateUser);
}

/**
 * Refunds a card subscription and cancels it now (admin only): the
 * charges of the 7-day withdrawal window, or the latest charge outside it.
 * The customer is e-mailed, and the audit log records `reason`.
 */
export async function refundUserSubscription(userId: string, reason: string) {
  if (!isUuid(userId)) return invalidRequest<StaffRefundResult>();
  const clean = typeof reason === "string" ? reason.trim() : "";
  if (clean.length < REFUND_REASON_MIN || clean.length > REFUND_REASON_MAX) {
    return invalidRequest<StaffRefundResult>();
  }
  return guardedAction(
    async () => {
      await requireStaff(true);
      return fetchServerApi<StaffRefundResult>(
        `/admin/users/${id(userId)}/subscription/refund`,
        {
          method: "POST",
          body: JSON.stringify({ reason: clean }),
          timeoutMs: 60_000,
        },
      );
    },
    () => {
      revalidateUser();
      revalidateBilling();
    },
  );
}

export async function adjustUserCredits(
  userId: string,
  payload: { amount: number; note: string },
) {
  if (!isUuid(userId)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<AdminSubscriptionView>(
      `/admin/users/${id(userId)}/credits`,
      { method: "POST", body: JSON.stringify(payload) },
    );
  }, revalidateUser);
}
