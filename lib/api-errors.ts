/**
 * Turns the API's machine-readable error codes into messages in the
 * user's language.
 *
 * The API answers every failure with `{ code, message, meta? }`. `message`
 * is English prose for logs and API consumers; `code` is a stable
 * identifier (see `setlyst-api/src/errors/api_error.rs`). Everything the
 * person reads goes through here, so a Portuguese UI never shows an
 * English backend sentence for a known situation.
 */

import { isPasswordIssue, type PasswordIssue } from "@/lib/password-policy";
import type { QuotaResource as LimitableQuotaResource } from "@/types/api";
import { formatApiDateTime } from "@/lib/dates";

/**
 * Resources with a limit staff can configure (plan limits, defaults and
 * per-user overrides): the keys of the API's `QuotaLimits`.
 */
export const LIMITABLE_QUOTA_RESOURCES = [
  "songs",
  "artists",
  "setlists",
  "gigs",
  "tags",
  "bands_owned",
  "band_memberships",
  "band_members",
  "band_setlists",
  "band_gigs",
  "band_songs",
  "setlist_items",
  "tours",
  "band_tours",
] as const satisfies readonly LimitableQuotaResource[];

/**
 * Every resource a `QUOTA_EXCEEDED` error can name: the configurable ones
 * plus the fixed limits (100 reminders per band, 12 pinned items).
 */
export const QUOTA_RESOURCES = [
  ...LIMITABLE_QUOTA_RESOURCES,
  "band_notes",
  "pins",
] as const;

export type QuotaResource = (typeof QUOTA_RESOURCES)[number];

export function isQuotaResource(value: unknown): value is QuotaResource {
  return (
    typeof value === "string" &&
    (QUOTA_RESOURCES as readonly string[]).includes(value)
  );
}

/** Codes that have a dedicated, translated message. */
export const TRANSLATED_CODES = [
  // Accounts and sessions
  "INVALID_CREDENTIALS",
  "ACCOUNT_BANNED",
  "ACCOUNT_DEACTIVATED",
  "ACCOUNT_LOCKED",
  "SESSION_REVOKED",
  "PASSWORD_CHANGE_REQUIRED",
  "WEAK_PASSWORD",
  "PASSWORD_REUSED",
  "WRONG_PASSWORD",
  "PASSWORD_NOT_SET",
  "TOO_MANY_ATTEMPTS",
  "IMPERSONATION_READ_ONLY",
  "INVALID_TWO_FACTOR_CODE",
  "TWO_FACTOR_ALREADY_ENABLED",
  "TWO_FACTOR_NOT_ENABLED",
  "INVALID_CODE",
  "CODE_EXPIRED",
  "EMAIL_NOT_VERIFIED",
  "EMAIL_TAKEN",
  "EMAIL_REQUIRED",
  "EMAIL_ALREADY_VERIFIED",
  "GOOGLE_SIGNIN_DISABLED",
  "INVALID_GOOGLE_TOKEN",
  "TERMS_NOT_ACCEPTED",
  "USERNAME_COOLDOWN",
  "USERNAME_TAKEN",
  "INVALID_IMAGE_URL",
  // Staff and permissions
  "INSUFFICIENT_ROLE",
  "CANNOT_TARGET_SELF",
  "LAST_ADMIN",
  "SHARE_LOCKED",
  "FORBIDDEN",
  // Bands
  "INVITE_INVALID",
  "ALREADY_MEMBER",
  // Plans and billing
  "QUOTA_EXCEEDED",
  "FEATURE_NOT_IN_PLAN",
  "PLAN_NOT_FOUND",
  "PROMO_CODE_INVALID",
  "PROMO_CODE_EXPIRED",
  "PROMO_CODE_EXHAUSTED",
  "PROMO_CODE_ALREADY_REDEEMED",
  "PROMO_CODE_NOT_ELIGIBLE",
  "INSUFFICIENT_CREDITS",
  "REWARD_NOT_FOUND",
  // Card payments
  "PAYMENTS_UNAVAILABLE",
  "BILLING_NOT_ENFORCED",
  "PLAN_NOT_PURCHASABLE",
  "PAID_SUBSCRIPTION_ACTIVE",
  "NO_PAID_SUBSCRIPTION",
  "PLAN_ALREADY_ACTIVE",
  "SUBSCRIPTION_PAST_DUE",
  "SUBSCRIPTION_CANCELING",
  "PAYMENT_DECLINED",
  "PAYMENT_PROVIDER_ERROR",
  // Content
  "INVALID_LINK",
  "REPERTOIRE_PROTECTED",
  "SONG_ALREADY_IN_SETLIST",
  "SUGGESTION_CLOSED",
  "NOT_IN_TRASH",
  "RESTORE_CONFLICT",
  "CHORDPRO_INVALID",
  "CHORDPRO_TOO_LARGE",
  "PAYLOAD_TOO_LARGE",
  // Announcements
  "NOT_DISMISSIBLE",
  "ANNOUNCEMENT_LOCKED",
  // Moderation
  "FLAG_ALREADY_RESOLVED",
  "TWO_FACTOR_UNAVAILABLE",
  // Generic
  "ALREADY_EXISTS",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "BAD_REQUEST",
  "UNPROCESSABLE_ENTITY",
  "SERVICE_BUSY",
] as const;

export type TranslatedCode = (typeof TRANSLATED_CODES)[number];

export type ErrorMeta = Record<string, unknown> | null | undefined;

/** Features that can be missing from a plan (`FEATURE_NOT_IN_PLAN`). */
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

/** Plan codes with a translated name; others are shown as sent. */
const KNOWN_PLANS = ["basic", "intermediate", "pro"] as const;

/** What a `RESTORE_CONFLICT` can be about. */
const TRASH_TYPES = ["song", "artist", "setlist", "gig", "tour"] as const;

/** Reasons a ChordPro file is refused (`CHORDPRO_INVALID`). */
const CHORDPRO_REASONS = [
  "line_too_long",
  "too_many_lines",
  "multiple_songs",
  "missing_title",
  "invalid_characters",
] as const;

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return (
    typeof value === "string" && (allowed as readonly string[]).includes(value)
  );
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * Minimal translator signature — satisfied by next-intl's `t` for the
 * `apiErrors` namespace, and trivially fakeable in tests.
 */
export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

function formatDate(value: unknown, locale: string): string | null {
  if (typeof value !== "string") return null;
  return formatApiDateTime(value, locale) || null;
}

/**
 * "Try again in ..." for a wait in seconds: seconds under a minute,
 * minutes (rounded up) otherwise.
 */
function describeWait(seconds: number, t: Translate): string {
  if (seconds < 60) return t("wait.seconds", { seconds: Math.ceil(seconds) });
  return t("wait.minutes", { minutes: Math.ceil(seconds / 60) });
}

/** The password issues reported by a `WEAK_PASSWORD` error. */
export function weakPasswordIssues(meta: ErrorMeta): PasswordIssue[] {
  const issues = (meta as { issues?: unknown } | null | undefined)?.issues;
  return Array.isArray(issues) ? issues.filter(isPasswordIssue) : [];
}

/**
 * A translated message for `code`, or `null` when the code has no
 * dedicated translation (the caller then falls back to the API's own
 * message or a generic one).
 */
export function describeApiError(
  code: string | null | undefined,
  meta: ErrorMeta,
  t: Translate,
  locale: string,
): string | null {
  if (!code || !(TRANSLATED_CODES as readonly string[]).includes(code)) {
    return null;
  }

  switch (code as TranslatedCode) {
    case "ACCOUNT_BANNED": {
      const until = formatDate(meta?.until, locale);
      const reason =
        typeof meta?.reason === "string" && meta.reason.trim()
          ? meta.reason.trim()
          : null;
      const base = until
        ? t("ACCOUNT_BANNED_UNTIL", { date: until })
        : t("ACCOUNT_BANNED_PERMANENT");
      return reason ? `${base} ${t("reason", { reason })}` : base;
    }
    case "QUOTA_EXCEEDED": {
      const resource = isQuotaResource(meta?.resource)
        ? meta.resource
        : "generic";
      const limit = typeof meta?.limit === "number" ? meta.limit : 0;
      return t("QUOTA_EXCEEDED", {
        limit,
        resource: t(`resources.${resource}`),
      });
    }
    case "USERNAME_COOLDOWN": {
      const date = formatDate(meta?.eligible_at, locale);
      return date
        ? t("USERNAME_COOLDOWN", { date })
        : t("USERNAME_COOLDOWN_GENERIC");
    }
    case "WEAK_PASSWORD": {
      const issues = weakPasswordIssues(meta);
      if (issues.length === 0) return t("WEAK_PASSWORD");
      return `${t("WEAK_PASSWORD")} ${issues
        .map((issue) => t(`passwordIssues.${issue}`))
        .join(" · ")}`;
    }
    case "TOO_MANY_ATTEMPTS":
    case "SERVICE_BUSY": {
      const seconds = positiveNumber(meta?.retry_after_seconds);
      return seconds ? `${t(code)} ${describeWait(seconds, t)}` : t(code);
    }
    case "ACCOUNT_LOCKED": {
      const until = formatDate(meta?.until, locale);
      return until ? t("ACCOUNT_LOCKED_UNTIL", { date: until }) : t(code);
    }
    case "INVALID_CODE": {
      const left = meta?.attempts_left;
      return typeof left === "number" && left >= 0
        ? t("INVALID_CODE_ATTEMPTS", { count: left })
        : t(code);
    }
    case "FEATURE_NOT_IN_PLAN": {
      const feature = oneOf(meta?.feature, PLAN_FEATURES)
        ? t(`features.${meta.feature}`)
        : null;
      const base = feature
        ? t("FEATURE_NOT_IN_PLAN_NAMED", { feature })
        : t(code);
      const planCode = typeof meta?.plan === "string" ? meta.plan : null;
      if (!planCode) return base;
      const plan = oneOf(planCode, KNOWN_PLANS)
        ? t(`plans.${planCode}`)
        : planCode;
      return `${base} ${t("availableFrom", { plan })}`;
    }
    case "INSUFFICIENT_CREDITS": {
      const balance = meta?.balance;
      const required = meta?.required;
      return typeof balance === "number" && typeof required === "number"
        ? t("INSUFFICIENT_CREDITS_DETAIL", { balance, required })
        : t(code);
    }
    case "RESTORE_CONFLICT": {
      return oneOf(meta?.type, TRASH_TYPES)
        ? t("RESTORE_CONFLICT_TYPED", { type: t(`trashTypes.${meta.type}`) })
        : t(code);
    }
    case "CHORDPRO_INVALID": {
      const reason = oneOf(meta?.reason, CHORDPRO_REASONS)
        ? t(`chordproReasons.${meta.reason}`)
        : null;
      const line = positiveNumber(meta?.line);
      const detail = [reason, line ? t("atLine", { line }) : null]
        .filter(Boolean)
        .join(" ");
      return detail ? `${t(code)} ${detail}` : t(code);
    }
    default:
      return t(code);
  }
}

/** A failed action result, as returned by `guardedAction`. */
interface FailureLike {
  success?: boolean;
  apiCode?: string;
}

/**
 * True when the API refused an update because nothing changed
 * (`UNPROCESSABLE_ENTITY`). Not an error for the person: show it with
 * `toast.info` (`toastActionError` already does) and treat the form as
 * saved.
 */
export function isNoChangeError(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as FailureLike).success === false &&
    (result as FailureLike).apiCode === "UNPROCESSABLE_ENTITY"
  );
}
