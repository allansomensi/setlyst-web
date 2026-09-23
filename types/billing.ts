/**
 * Shapes of the authenticated billing endpoints (`GET /billing/me` and
 * friends). Plans reuse the public plan types.
 */

import type { BillingInterval } from "@/lib/pricing";
import type { PlanBase, PlanFeatures } from "@/types/public";

export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "canceled" | "expired";

export type SubscriptionSource =
  "trial" | "admin" | "promo_code" | "credits" | "referral" | "payment";

/** A plan as the billing and staff endpoints return it. */
export interface Plan extends PlanBase {
  is_public: boolean;
  updated_at: string;
}

export interface Subscription {
  plan_code: string;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  started_at: string;
  /** `null` = open-ended. */
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  /** How a paid subscription is charged; `null` for everything else. */
  billing_interval?: BillingInterval | null;
}

export interface CreditReward {
  id: string;
  plan: string;
  days: number;
  cost: number;
}

export interface BillingMe {
  /** Whether plans are enforced at all. While `false`, everything is allowed. */
  enforced: boolean;
  /** Whether card payments are set up on the server (checkout available). */
  payments_enabled?: boolean;
  plan: Plan | null;
  subscription: Subscription | null;
  /** Effective feature flags for the caller. */
  features: PlanFeatures;
  credits: { balance: number };
  referral: {
    code: string | null;
    link_path: string | null;
    rewarded_count: number;
    pending_count: number;
  };
  rewards: CreditReward[];
}
