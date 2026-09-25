/**
 * Pure pricing helpers for the public pricing page (formatting, yearly
 * savings, promotions). Kept free of React and next-intl so they are unit
 * tested in lib/__tests__/pricing.test.ts.
 */

import { parseApiTimestamp } from "@/lib/dates";
import type { PublicPlan } from "@/types/public";

export type BillingInterval = "monthly" | "yearly";

/**
 * Whether plans are actually charged. Mirrors the API's `billing.enforced`
 * setting, which has no public endpoint: while it is off (pre-release)
 * every feature is free and the pricing page says so.
 */
/**
 * Fallback only: the public site asks the API (`getBillingMode` in
 * lib/public-api.ts) and uses this when the API can't be reached.
 */
export function isBillingEnforced(
  value: string | undefined = process.env.NEXT_PUBLIC_BILLING_ENFORCED,
): boolean {
  return value === "true" || value === "1";
}

/**
 * How much cheaper paying yearly is than twelve monthly payments, as a
 * whole percentage (0 when there's no saving or the plan is free).
 */
export function yearlySavingsPercent(
  monthlyCents: number,
  yearlyCents: number,
): number {
  if (monthlyCents <= 0 || yearlyCents <= 0) return 0;
  const full = monthlyCents * 12;
  if (yearlyCents >= full) return 0;
  return Math.round(((full - yearlyCents) / full) * 100);
}

/** `cents` with `percent` off, rounded to whole cents. */
export function applyDiscount(cents: number, percent: number): number {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return Math.round(cents * (1 - clamped / 100));
}

export interface PlanPrice {
  /** Price charged per period (after any promotion). */
  cents: number;
  /** Price before the promotion, when one applies. */
  originalCents: number | null;
  /** Yearly price spread over 12 months (yearly interval only). */
  perMonthCents: number | null;
  isFree: boolean;
}

/** The price shown for `plan` on `interval`, with its promotion applied. */
export function planPrice(
  plan: Pick<
    PublicPlan,
    "price_monthly_cents" | "price_yearly_cents" | "promotion"
  >,
  interval: BillingInterval,
): PlanPrice {
  const base =
    interval === "monthly" ? plan.price_monthly_cents : plan.price_yearly_cents;
  const percent = plan.promotion?.discount_percent ?? 0;
  const cents = percent > 0 ? applyDiscount(base, percent) : base;
  return {
    cents,
    originalCents: percent > 0 && base > 0 ? base : null,
    perMonthCents: interval === "yearly" ? Math.round(cents / 12) : null,
    isFree: base <= 0,
  };
}

/** Best yearly saving across plans, for the interval toggle's hint. */
export function maxYearlySavings(plans: PublicPlan[]): number {
  return plans.reduce(
    (best, plan) =>
      Math.max(
        best,
        yearlySavingsPercent(plan.price_monthly_cents, plan.price_yearly_cents),
      ),
    0,
  );
}

/**
 * Limits at or above this are shown as "Ilimitado" (the API caps any
 * limit at one million).
 */
export const UNLIMITED_THRESHOLD = 1_000_000;

export function isUnlimited(value: number | undefined | null): boolean {
  return typeof value === "number" && value >= UNLIMITED_THRESHOLD;
}

/**
 * Whether a promotion is still running at `now`. `ends_at` comes from the
 * API as a naive UTC timestamp.
 */
export function isPromotionActive(
  endsAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!endsAt) return false;
  const end = parseApiTimestamp(endsAt);
  return !Number.isNaN(end.getTime()) && end.getTime() > now.getTime();
}
