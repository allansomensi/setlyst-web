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
