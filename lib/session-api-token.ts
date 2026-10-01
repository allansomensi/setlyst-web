import type { JWT } from "next-auth/jwt";

/**
 * The bearer token for API calls made on behalf of a session JWT, or null
 * when it has no usable one. Pure, so it can be unit tested; the server
 * reads the JWT in lib/server/api-token.ts.
 *
 * An expired impersonation token yields null rather than the staff
 * member's own token: a page still rendered as the impersonated account
 * must never act with staff privileges. The 401 that follows makes the
 * client refresh its session, and the `jwt` callback (lib/auth.ts) then
 * restores the staff session.
 */
export function apiTokenOf(
  token: Pick<JWT, "apiToken" | "apiTokenExpires" | "error"> | null,
  now: number = Date.now(),
): string | null {
  if (!token || token.error === "TokenExpired") return null;
  if (!token.apiToken) return null;
  const expires = token.apiTokenExpires;
  if (typeof expires === "number" && now >= expires) return null;
  return token.apiToken;
}

/**
 * Whether a session JWT can no longer act for its account, judged the way
 * the `jwt` callback (lib/auth.ts) will judge it on the next server read.
 *
 * The proxy decrypts the cookie without running that callback, so it can't
 * rely on `token.error` alone: the session cookie is renewed on every visit
 * (`updateAge`), while the API token inside it has a fixed lifetime. Without
 * this check a visitor coming back after the API token ran out was let
 * through to the dashboard, whose layout sent them to /login, which the
 * proxy — still seeing a "valid" session — sent back to the dashboard: an
 * endless redirect loop.
 *
 * An expired impersonation is not an expired session: the callback falls
 * back to the staff member's own token, so only that one decides.
 */
export function isSessionExpired(
  token: Pick<
    JWT,
    "apiToken" | "apiTokenExpires" | "error" | "impersonator"
  > | null,
  now: number = Date.now(),
): boolean {
  if (!token) return true;
  if (token.error === "TokenExpired") return true;
  if (!token.apiToken) return true;
  const expires = token.apiTokenExpires;
  if (typeof expires !== "number" || now < expires) return false;
  const original = token.impersonator;
  if (!original) return true;
  const originalExpires = original.apiTokenExpires;
  return typeof originalExpires === "number" && now >= originalExpires;
}

/**
 * Whether the session is a "view as" whose impersonation token ran out
 * while the staff member's own session is still good: the next read
 * through the `jwt` callback (lib/auth.ts) restores the staff session,
 * so the client should refresh it instead of signing out.
 */
export function isImpersonationExpired(
  token: Pick<
    JWT,
    "apiToken" | "apiTokenExpires" | "error" | "impersonator"
  > | null,
  now: number = Date.now(),
): boolean {
  if (!token?.impersonator || token.error === "TokenExpired") return false;
  const expires = token.apiTokenExpires;
  return (
    typeof expires === "number" &&
    now >= expires &&
    !isSessionExpired(token, now)
  );
}

/**
 * How old the API token may get before an active session swaps it for a
 * fresh one (`POST /auth/refresh`). The API token lives 30 days; renewing
 * it at most twice a day while the app is in use means a session only
 * ends after 30 days without opening Setlyst (or when it is revoked:
 * password change, "sign out everywhere", suspension).
 */
export const SESSION_RENEW_AFTER_MS = 12 * 60 * 60 * 1000;

/**
 * Whether the session's own API token is due for renewal. Never for an
 * impersonation ("view as" tokens are short-lived on purpose) nor for a
 * session that has already ended. A token from before issue times were
 * recorded counts as due.
 */
export function isApiTokenRenewalDue(
  token: Pick<
    JWT,
    "apiToken" | "apiTokenExpires" | "apiTokenIssued" | "error" | "impersonator"
  > | null,
  now: number = Date.now(),
): boolean {
  if (!token || token.impersonator) return false;
  if (!apiTokenOf(token, now)) return false;
  const issued = token.apiTokenIssued;
  return typeof issued !== "number" || now - issued >= SESSION_RENEW_AFTER_MS;
}
