/**
 * Decodes the `error` string NextAuth hands back from `signIn()`.
 *
 * `authorize` (lib/auth.ts) throws JSON-encoded `{ code, meta }` errors so
 * the login page can explain *why* a sign-in failed. Anything else
 * (NextAuth's own "CredentialsSignin", an older build) is treated as
 * invalid credentials.
 */

export type SignInErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_BANNED"
  | "ACCOUNT_DEACTIVATED"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE";

export interface SignInError {
  code: SignInErrorCode;
  meta: Record<string, unknown> | null;
}

const KNOWN: readonly SignInErrorCode[] = [
  "INVALID_CREDENTIALS",
  "ACCOUNT_BANNED",
  "ACCOUNT_DEACTIVATED",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
];

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
