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

export const QUOTA_RESOURCES = [
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
  "INVALID_CREDENTIALS",
  "ACCOUNT_BANNED",
  "ACCOUNT_DEACTIVATED",
  "SESSION_REVOKED",
  "PASSWORD_CHANGE_REQUIRED",
  "WEAK_PASSWORD",
  "PASSWORD_REUSED",
  "IMPERSONATION_READ_ONLY",
  "QUOTA_EXCEEDED",
  "INSUFFICIENT_ROLE",
  "CANNOT_TARGET_SELF",
  "LAST_ADMIN",
  "SHARE_LOCKED",
  "USERNAME_COOLDOWN",
  "USERNAME_TAKEN",
  "INVITE_INVALID",
  "ALREADY_MEMBER",
  "ALREADY_EXISTS",
  "NOT_FOUND",
  "FORBIDDEN",
  "UNPROCESSABLE_ENTITY",
  "WRONG_PASSWORD",
] as const;

export type TranslatedCode = (typeof TRANSLATED_CODES)[number];

export type ErrorMeta = Record<string, unknown> | null | undefined;

/**
 * Minimal translator signature — satisfied by next-intl's `t` for the
 * `apiErrors` namespace, and trivially fakeable in tests.
 */
export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

function formatDate(value: unknown, locale: string): string | null {
  if (typeof value !== "string" || !value) return null;
  // The API sends naive UTC timestamps ("2026-09-22T21:31:00").
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
    default:
      return t(code);
  }
}
