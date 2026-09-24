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
