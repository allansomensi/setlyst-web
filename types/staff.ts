/**
 * Staff console shapes added in v0.12: moderation, billing administration
 * (settings, overview, plans, subscriptions, credits, promo codes and
 * promotions). Timestamps are naive UTC strings (see lib/dates.ts).
 */

import type { UserRole } from "@/types/api";
import type {
  CreditReward,
  Plan,
  Subscription,
  SubscriptionStatus,
} from "@/types/billing";
import type { LocalizedText } from "@/types/public";

// ---------------------------------------------------------------- moderation

export const MODERATION_TARGETS = [
  "avatar",
  "username",
  "band_logo",
  "profile",
] as const;
export type ModerationTarget = (typeof MODERATION_TARGETS)[number];

/** `actioned` = something was removed or reset. */
export type ModerationStatus = "open" | "dismissed" | "actioned";

export type ModerationSource = "automatic" | "report";

export type ModerationAction =
  "dismiss" | "remove_avatar" | "remove_band_logo" | "reset_username";

export interface ModerationFlag {
  id: string;
  target_type: ModerationTarget;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    role: UserRole;
    is_banned: boolean;
  };
  band: { id: string; name: string } | null;
  /** The flagged value when the flag was raised. */
  value: string;
  /** The current avatar, username or logo (`null` = removed). */
  current_value: string | null;
  reasons: string[];
  score: number | null;
  details: Record<string, unknown>;
  source: ModerationSource;
  reported_by_username: string | null;
  report_note: string | null;
  status: ModerationStatus;
  /** `dismissed`, `avatar_removed`, `band_logo_removed`, `username_reset`. */
  resolution: string | null;
  resolution_note: string | null;
  resolved_by_username: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ModerationSummary {
  open_total: number;
  by_type: Partial<Record<ModerationTarget, number>>;
}

export interface ResolveFlagPayload {
  action: ModerationAction;
  note: string | null;
  notify_user: boolean;
}

// ------------------------------------------------------------------ billing

export interface ReferralSettings {
  enabled: boolean;
  referrer_credits: number;
  referred_credits: number;
  max_rewarded_per_month: number;
}

export interface BillingSettings {
  enforced: boolean;
  trial_days: number;
  trial_plan: string;
  referral: ReferralSettings;
  rewards: CreditReward[];
}

export interface BillingOverview {
  enforced: boolean;
  by_status: Partial<Record<SubscriptionStatus, number>>;
  by_plan: Record<string, number>;
  accounts_without_subscription: number;
  credits_issued: number;
  credits_spent: number;
  promo_redemptions_last_30_days: number;
  referrals_rewarded: number;
}

export interface SubscriptionEvent {
  id: string;
  kind: string;
  from_plan: string | null;
  to_plan: string | null;
  from_status: SubscriptionStatus | null;
  to_status: SubscriptionStatus | null;
  data: Record<string, unknown>;
  actor_username: string | null;
  created_at: string;
}

export interface AdminSubscriptionView {
  subscription: Subscription | null;
  events: SubscriptionEvent[];
  credits_balance: number;
}

/** Body of `PUT /admin/plans/{code}`. */
export type UpsertPlanPayload = Omit<Plan, "code" | "updated_at">;

export const PROMO_KINDS = [
  "plan_grant",
  "trial_extension",
  "credits",
  "discount",
] as const;
export type PromoKind = (typeof PROMO_KINDS)[number];

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  kind: PromoKind;
  plan_code: string | null;
  duration_days: number | null;
  credits: number | null;
  discount_percent: number | null;
  max_redemptions: number | null;
  redemptions_count: number;
  new_users_only: boolean;
  starts_at: string | null;
  expires_at: string | null;
  disabled_at: string | null;
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePromoCodePayload {
  code: string | null;
  description: string | null;
  kind: PromoKind;
  plan_code: string | null;
  duration_days: number | null;
  credits: number | null;
  discount_percent: number | null;
  max_redemptions: number | null;
  new_users_only: boolean;
  starts_at: string | null;
  expires_at: string | null;
}

export interface UpdatePromoCodePayload {
  description?: string | null;
  expires_at?: string | null;
  max_redemptions?: number | null;
  disabled?: boolean;
}

export interface PromoRedemption {
  user_id: string;
  username: string;
  redeemed_at: string;
}

export interface Promotion {
  id: string;
  name: string;
  headline: LocalizedText;
  /** `null` = every plan. */
  plan_code: string | null;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionPayload {
  name: string;
  headline: LocalizedText;
  plan_code: string | null;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
}
