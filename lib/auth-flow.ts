/**
 * Pure helpers of the sign-in and sign-up flows: referral codes, the
 * Google sign-in intent cookie and one-time code inputs.
 *
 * No Next.js imports, so they are shared by client components, server
 * actions and the next-auth callbacks, and unit tested
 * (lib/__tests__/auth-flow.test.ts).
 */

import { safeCallbackPath } from "@/lib/links";

// ---------------------------------------------------------------------
// Referral codes
// ---------------------------------------------------------------------

/**
 * Remembers the `?ref=` of a sign-up link for a while, so a visitor who
 * reads the pricing page first (or signs up with Google, which leaves the
 * site) is still credited to whoever invited them.
 */
export const REFERRAL_COOKIE = "setlyst_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** The API accepts up to 32 characters; real codes are 10 uppercase. */
const REFERRAL_MAX_LENGTH = 32;

/**
 * A referral code as typed or read from a link: trimmed, uppercased and
 * stripped of anything but letters, digits, `-` and `_`. Empty → null.
 */
export function normalizeReferralCode(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, REFERRAL_MAX_LENGTH);
  return code || null;
}

/** `document.cookie` assignment persisting `code` (browser only). */
export function referralCookieString(code: string, secure: boolean): string {
  const parts = [
    `${REFERRAL_COOKIE}=${encodeURIComponent(code)}`,
    "Path=/",
    `Max-Age=${REFERRAL_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** The referral code stored in a `Cookie` header string, if any. */
export function readReferralCookie(cookieHeader: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === REFERRAL_COOKIE) {
      try {
        return normalizeReferralCode(decodeURIComponent(rest.join("=")));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// Google sign-in intent
// ---------------------------------------------------------------------

/**
 * What the person chose before leaving for Google, read back by the
 * `signIn` callback when Google redirects to us. Stored server-side in a
 * short-lived httpOnly cookie (lib/actions/google-auth.ts).
 */
export const GOOGLE_INTENT_COOKIE = "setlyst_google_intent";
export const GOOGLE_INTENT_MAX_AGE = 60 * 10; // 10 minutes

/**
 * The name and e-mail Google returned for a sign-up that still needs
 * consent to the terms, shown on the consent page.
 */
export const GOOGLE_SIGNUP_COOKIE = "setlyst_google_signup";

export type GoogleIntentMode = "signin" | "link";

export interface GoogleIntent {
  /** `link`: started from the security settings while signed in. */
  mode: GoogleIntentMode;
  locale: string;
  referralCode: string | null;
  acceptTerms: boolean;
  marketingOptIn: boolean;
  /** Where to land after a successful sign-in (app-relative path). */
  callbackPath: string | null;
}

/** Parses the intent cookie; anything malformed is ignored. */
export function parseGoogleIntent(
  raw: string | null | undefined,
  locales: readonly string[],
  defaultLocale: string,
): GoogleIntent | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const callbackPath =
    typeof v.callbackPath === "string"
      ? safeCallbackPath(v.callbackPath)
      : null;
  return {
    mode: v.mode === "link" ? "link" : "signin",
    locale:
      typeof v.locale === "string" && locales.includes(v.locale)
        ? v.locale
        : defaultLocale,
    referralCode: normalizeReferralCode(
      typeof v.referralCode === "string" ? v.referralCode : null,
    ),
    acceptTerms: v.acceptTerms === true,
    marketingOptIn: v.marketingOptIn === true,
    callbackPath,
  };
}

export interface GoogleSignupInfo {
  email: string | null;
  name: string | null;
}

/** The consent page's cookie payload (email/name as Google sent them). */
export function parseGoogleSignup(
  raw: string | null | undefined,
): GoogleSignupInfo | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const text = (input: unknown, max: number) =>
      typeof input === "string" && input.trim()
        ? input.trim().slice(0, max)
        : null;
    return { email: text(value.email, 254), name: text(value.name, 120) };
  } catch {
    return null;
  }
}

/**
 * The second step of a Google sign-in on an account with two-factor
 * authentication: the API's challenge, kept in a short-lived httpOnly
 * cookie between the OAuth callback and the login page so the token never
 * appears in a URL (access logs, analytics, history).
 */
export const GOOGLE_2FA_COOKIE = "setlyst_google_2fa";

export interface GoogleTwoFactorChallenge {
  token: string;
  expiresAt: string | null;
  callbackPath: string | null;
}

/** Cookie value for a challenge (see parseGoogleTwoFactor). */
export function serializeGoogleTwoFactor(
  challenge: GoogleTwoFactorChallenge,
): string {
  return JSON.stringify({
    challenge: challenge.token,
    expires: challenge.expiresAt,
    callbackPath: challenge.callbackPath,
  });
}

/** Seconds the cookie should live: until the challenge expires, at most 10 minutes. */
export function googleTwoFactorMaxAge(
  expiresAt: string | null,
  now: number = Date.now(),
): number {
  const expires = expiresAt ? Date.parse(expiresAt) : NaN;
  if (Number.isNaN(expires)) return GOOGLE_INTENT_MAX_AGE;
  return Math.max(
    1,
    Math.min(GOOGLE_INTENT_MAX_AGE, Math.ceil((expires - now) / 1000)),
  );
}

/** Parses the challenge cookie; malformed or expired values are ignored. */
export function parseGoogleTwoFactor(
  raw: string | null | undefined,
  now: number = Date.now(),
): GoogleTwoFactorChallenge | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const token = typeof v.challenge === "string" ? v.challenge.trim() : "";
  if (!token || token.length > 128) return null;
  const expiresAt =
    typeof v.expires === "string" && !Number.isNaN(Date.parse(v.expires))
      ? v.expires
      : null;
  if (expiresAt && Date.parse(expiresAt) <= now) return null;
  return {
    token,
    expiresAt,
    callbackPath:
      typeof v.callbackPath === "string"
        ? safeCallbackPath(v.callbackPath)
        : null,
  };
}

// ---------------------------------------------------------------------
// One-time codes
// ---------------------------------------------------------------------

/** Digits of an authenticator / e-mail code: anything else is dropped. */
export function sanitizeOtp(value: string, length = 6): string {
  return value.replace(/\D/g, "").slice(0, length);
}

/**
 * A recovery code as typed (`abcd efgh`, `ABCD-EFGH`, `abcdefgh`) in the
 * API's `XXXX-XXXX` form. Only letters and digits are kept; the dash is
 * added after the fourth character.
 */
export function sanitizeRecoveryCode(value: string): string {
  const raw = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

/** Whether a sanitized recovery code is complete. */
export function isCompleteRecoveryCode(value: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value);
}

/** "m:ss" for a countdown in seconds (never negative). */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}
