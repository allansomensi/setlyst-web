/**
 * Shapes of the public (no session) API endpoints consumed by the public
 * site: `GET /public/plans`, `GET /public/release-notes`,
 * `GET|POST /public/email/unsubscribe` and `GET /public/legal/version`.
 */

/** A text per locale (`en` and `pt-BR` always present, `es` optional). */
export type LocalizedText = Partial<Record<string, string>>;

export const PLAN_FEATURES = [
  "create_bands",
  "tours",
  "analytics_export",
  "advanced_pdf",
  "chordpro_import",
  "song_suggestions",
  "public_sharing",
  "offline_mode",
  "priority_support",
] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export const PLAN_LIMITS = [
  "songs",
  "artists",
  "setlists",
  "setlist_items",
  "gigs",
  "tours",
  "tags",
  "bands_owned",
  "band_memberships",
  "band_members",
  "band_songs",
  "band_setlists",
  "band_gigs",
  "band_tours",
] as const;
export type PlanLimit = (typeof PLAN_LIMITS)[number];

export interface PlanPromotion {
  id: string;
  headline: LocalizedText;
  discount_percent: number;
  /** UTC, without offset (`2026-10-01T00:00:00`). */
  ends_at: string;
}

/** Limits by resource (`-1` = unlimited); unknown keys are kept. */
export type PlanLimits = Partial<Record<PlanLimit, number>> &
  Record<string, number>;

/** Feature flags; unknown keys are kept. */
export type PlanFeatures = Partial<Record<PlanFeature, boolean>> &
  Record<string, boolean>;

/** What every plan shape has (public list, billing, staff console). */
export interface PlanBase {
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  price_monthly_cents: number;
  price_yearly_cents: number;
  currency: string;
  limits: PlanLimits;
  features: PlanFeatures;
  highlighted: boolean;
  sort_order: number;
}

/** `GET /public/plans`: public plans with their running promotion. */
export interface PublicPlan extends PlanBase {
  promotion: PlanPromotion | null;
}

export type ReleaseItemKind = "new" | "improved" | "fixed" | "security";

export interface ReleaseNoteItem {
  kind: ReleaseItemKind | (string & {});
  text: LocalizedText;
}

export interface ReleaseNote {
  id: string;
  version: string;
  title: LocalizedText;
  items: ReleaseNoteItem[];
  /** `YYYY-MM-DD`. */
  released_on: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by_username: string | null;
  is_edited: boolean;
}

export const COMMUNICATION_CATEGORIES = [
  "security",
  "account",
  "bands",
  "announcements",
  "product_updates",
  "marketing",
] as const;
export type CommunicationCategory = (typeof COMMUNICATION_CATEGORIES)[number];

export interface UnsubscribeInfo {
  category: CommunicationCategory | null;
  valid: boolean;
}
