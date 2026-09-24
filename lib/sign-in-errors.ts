/**
 * Decodes the `error` string NextAuth hands back from `signIn()`.
 *
 * `authorize` (lib/auth.ts) throws JSON-encoded `{ code, meta }` errors so
 * the login page can explain *why* a sign-in failed, or continue it (the
 * second step of a two-factor sign-in). Anything else (NextAuth's own
 * "CredentialsSignin", an older build) is treated as invalid credentials.
 *
 * Pure (no Next.js imports): shared by the server (`authorize`) and the
 * login page, and unit tested.
 */

import { parseApiTimestamp } from "@/lib/dates";

export type SignInErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_BANNED"
  | "ACCOUNT_DEACTIVATED"
  | "ACCOUNT_LOCKED"
  | "TOO_MANY_ATTEMPTS"
  | "RATE_LIMITED"
  | "SERVICE_BUSY"
  | "SERVICE_UNAVAILABLE"
  /** Not a failure: the password was right, a code must follow. */
  | "TWO_FACTOR_REQUIRED"
  | "INVALID_TWO_FACTOR_CODE"
  | "CODE_EXPIRED"
  // Google sign-in outcomes (lib/auth.ts, completeGoogleSignIn).
  | "EMAIL_TAKEN"
  | "EMAIL_REQUIRED"
  | "INVALID_GOOGLE_TOKEN"
  | "GOOGLE_SIGNIN_DISABLED"
  | "TERMS_NOT_ACCEPTED"
  | "AGE_CONFIRMATION_REQUIRED"
  /**
   * The address belongs to an account Google can't vouch for (not Gmail,
   * not the address's own Workspace): sign in with the password, then
   * link Google from the settings.
   */
  | "ACCOUNT_LINK_REQUIRED";

export interface SignInError {
  code: SignInErrorCode;
  meta: Record<string, unknown> | null;
}

const KNOWN: readonly SignInErrorCode[] = [
  "INVALID_CREDENTIALS",
  "ACCOUNT_BANNED",
  "ACCOUNT_DEACTIVATED",
  "ACCOUNT_LOCKED",
  "TOO_MANY_ATTEMPTS",
  "RATE_LIMITED",
  "SERVICE_BUSY",
  "SERVICE_UNAVAILABLE",
  "TWO_FACTOR_REQUIRED",
  "INVALID_TWO_FACTOR_CODE",
  "CODE_EXPIRED",
  "EMAIL_TAKEN",
  "EMAIL_REQUIRED",
  "INVALID_GOOGLE_TOKEN",
  "GOOGLE_SIGNIN_DISABLED",
  "TERMS_NOT_ACCEPTED",
  "AGE_CONFIRMATION_REQUIRED",
  "ACCOUNT_LINK_REQUIRED",
];

export function isSignInErrorCode(value: unknown): value is SignInErrorCode {
  return typeof value === "string" && KNOWN.includes(value as SignInErrorCode);
}

/** Longest ban reason shown (the API caps it well below this). */
const MAX_REASON_LENGTH = 500;

/**
 * Only the meta fields the login page knows how to show, each with the
 * type it must have: a server-issued error can't smuggle anything else
 * into the page.
 */
export function sanitizeSignInMeta(
  meta: unknown,
): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object") return null;
  const source = meta as Record<string, unknown>;
  const clean: Record<string, unknown> = {};

  const until = source.until;
  if (
    typeof until === "string" &&
    until.length <= 40 &&
    /^[0-9T:.+\-Z ]+$/i.test(until)
  ) {
    clean.until = until;
  }
  const retry = source.retry_after_seconds;
  if (typeof retry === "number" && Number.isFinite(retry) && retry > 0) {
    clean.retry_after_seconds = retry;
  }
  const left = source.attempts_left;
  if (typeof left === "number" && Number.isInteger(left) && left >= 0) {
    clean.attempts_left = left;
  }
  const reason = source.reason;
  if (typeof reason === "string" && reason.trim()) {
    clean.reason = reason.trim().slice(0, MAX_REASON_LENGTH);
  }
  for (const key of ["challenge_token", "challenge_expires_at"] as const) {
    const value = source[key];
    if (typeof value === "string" && value.length <= 256) clean[key] = value;
  }

  return Object.keys(clean).length > 0 ? clean : null;
}

/**
 * A sign-in error named in a URL (`/login?google_error=CODE`). Anyone can
 * write such a link, so only a bare, known code is accepted and it never
 * carries meta: no attacker-chosen "reason" or date can reach the page.
 * The details of a real Google failure travel in an httpOnly cookie
 * instead (see `takeGoogleSignInError`).
 */
export function parseUrlSignInError(
  value: string | null | undefined,
): SignInError | null {
  if (!value) return null;
  const code = value.trim();
  if (!isSignInErrorCode(code) || code === "TWO_FACTOR_REQUIRED") return null;
  return { code, meta: null };
}

/** The JSON message `authorize` throws (see `parseSignInError`). */
export function encodeSignInError(
  code: SignInErrorCode,
  meta?: Record<string, unknown> | null,
): string {
  return JSON.stringify({ code, meta: meta ?? null });
}

export function parseSignInError(
  error: string | null | undefined,
): SignInError {
  if (!error) return { code: "INVALID_CREDENTIALS", meta: null };
  try {
    const parsed = JSON.parse(error) as { code?: unknown; meta?: unknown };
    const code = KNOWN.includes(parsed.code as SignInErrorCode)
      ? (parsed.code as SignInErrorCode)
      : "INVALID_CREDENTIALS";
    const meta =
      parsed.meta && typeof parsed.meta === "object"
        ? (parsed.meta as Record<string, unknown>)
        : null;
    return { code, meta };
  } catch {
    return { code: "INVALID_CREDENTIALS", meta: null };
  }
}

/** A pending second sign-in step, as carried by `TWO_FACTOR_REQUIRED`. */
export interface TwoFactorChallenge {
  token: string;
  /** Naive UTC timestamp from the API, or null when unknown. */
  expiresAt: string | null;
}

/**
 * The challenge of a `TWO_FACTOR_REQUIRED` error, or null when `error`
 * is anything else (or the meta is malformed).
 */
export function twoFactorChallengeOf(
  error: SignInError,
): TwoFactorChallenge | null {
  if (error.code !== "TWO_FACTOR_REQUIRED") return null;
  const token = error.meta?.challenge_token;
  if (typeof token !== "string" || !token || token.length > 256) return null;
  const expiresAt = error.meta?.challenge_expires_at;
  return {
    token,
    expiresAt: typeof expiresAt === "string" ? expiresAt : null,
  };
}

/**
 * Seconds to wait before retrying, from `meta.retry_after_seconds` or
 * `meta.until` (a naive UTC timestamp), relative to `now`. Null when the
 * error carries no usable wait.
 */
export function waitSecondsOf(
  meta: Record<string, unknown> | null | undefined,
  now: number = Date.now(),
): number | null {
  const retry = meta?.retry_after_seconds;
  if (typeof retry === "number" && Number.isFinite(retry) && retry > 0) {
    return Math.ceil(retry);
  }
  const until = meta?.until;
  if (typeof until === "string" && until) {
    const time = parseApiTimestamp(until).getTime();
    if (!Number.isNaN(time) && time > now) {
      return Math.ceil((time - now) / 1000);
    }
  }
  return null;
}

/** `attempts_left` of an invalid-code error, when present. */
export function attemptsLeftOf(
  meta: Record<string, unknown> | null | undefined,
): number | null {
  const left = meta?.attempts_left;
  return typeof left === "number" && Number.isInteger(left) && left >= 0
    ? left
    : null;
}
