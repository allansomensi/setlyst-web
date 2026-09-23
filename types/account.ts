/**
 * Shapes of the self-service account endpoints under `/users/me` (e-mail,
 * two-factor, linked providers, communication preferences, deletion) and
 * of the billing history lists. Mirrors `setlyst-api/src/models/
 * {security,communication,billing,user}.rs`.
 */

import type { CommunicationCategory } from "@/types/public";
import type { SubscriptionStatus } from "@/types/billing";

/** Answer of the endpoints that e-mail a 6-digit code. */
export interface CodeSentResponse {
  expires_at: string;
  /** Seconds before another code may be requested. */
  resend_after_seconds: number;
}

/** `GET /users/me/security`. */
export interface SecurityOverview {
  two_factor_enabled: boolean;
  two_factor_enabled_at: string | null;
  recovery_codes_remaining: number;
  /** `false` for accounts created with Google that never set one. */
  password_set: boolean;
  email_verified: boolean;
  has_google: boolean;
  last_login_at: string | null;
}

/** `POST /users/me/2fa/setup`. */
export interface TwoFactorSetup {
  /** Base32, for typing into the authenticator app. */
  secret: string;
  otpauth_url: string;
  expires_at: string;
}

/** `POST /users/me/2fa/enable` and `/2fa/recovery-codes`. */
export interface RecoveryCodes {
  recovery_codes: string[];
}

/** `GET /users/me/identities`. */
export interface LinkedIdentity {
  provider: "google" | string;
  email: string | null;
  created_at: string;
  last_used_at: string | null;
}

/** One category of `GET /users/me/communication`. */
export interface CommunicationChannels {
  email: boolean;
  in_app: boolean;
  /** Security messages can't be turned off. */
  locked: boolean;
}

export interface CommunicationSettings {
  categories: Partial<Record<CommunicationCategory, CommunicationChannels>>;
  email_verified: boolean;
  email: string | null;
}

/** Body of `PUT /users/me/communication` (only the categories sent change). */
export interface UpdateCommunicationPayload {
  categories: Partial<
    Record<CommunicationCategory, { email: boolean; in_app: boolean }>
  >;
}

/** Why a profile is reported (`POST /users/{id}/report`). */
export const REPORT_REASONS = [
  "inappropriate_avatar",
  "offensive_username",
  "impersonation",
  "spam",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Credit ledger reasons (`credit_ledger.reason`). */
export type CreditReason =
  | "referral_referrer"
  | "referral_referred"
  | "promo_code"
  | "reward_redemption"
  | "admin_adjustment"
  | (string & {});

/** `GET /billing/credits` rows. */
export interface CreditEntry {
  id: string;
  /** Positive = received, negative = spent. */
  amount: number;
  reason: CreditReason;
  note: string | null;
  created_at: string;
}

export type ReferralStatus = "pending" | "rewarded" | "rejected";

/** `GET /billing/referrals` rows. */
export interface ReferralEntry {
  username: string;
  status: ReferralStatus;
  created_at: string;
  rewarded_at: string | null;
}

/** `GET /billing/history` rows. */
export interface SubscriptionEvent {
  id: string;
  /** `trial_started`, `trial_extended`, `plan_granted`, `extended`, `revoked`... */
  kind: string;
  from_plan: string | null;
  to_plan: string | null;
  from_status: SubscriptionStatus | null;
  to_status: SubscriptionStatus | null;
  data: Record<string, unknown>;
  actor_username: string | null;
  created_at: string;
}

export type PromoKind =
  "plan_grant" | "trial_extension" | "credits" | "discount";

/** What a redeemed promo code did (`POST /billing/redeem`). */
export interface RedemptionSummary {
  kind: PromoKind;
  plan_code: string | null;
  days: number | null;
  credits: number | null;
  /** Applies to the next payment, not now. */
  discount_percent: number | null;
}
