import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getToken, type JWT } from "next-auth/jwt";
import { apiTokenOf } from "@/lib/session-api-token";

const SECURE_COOKIE = "__Secure-next-auth.session-token";
const PLAIN_COOKIE = "next-auth.session-token";

/**
 * The decoded session JWT of the current request, read straight from the
 * encrypted session cookie. Server-only: the API token it carries never
 * reaches the browser (it is not part of the `session()` callback output
 * any more, see lib/auth.ts).
 *
 * Request-scoped (React `cache`): every `fetchServerApi` call reads it,
 * and a page making ten calls used to decrypt the same cookie ten times.
 */
export const getSessionToken = cache(async (): Promise<JWT | null> => {
  const cookieStore = await cookies();
  // The cookie name depends on whether next-auth decided the site runs on
  // https; read whichever one the browser actually sent.
  const secureCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith(SECURE_COOKIE));

  try {
    return await getToken({
      // getToken only needs something exposing the request cookies.
      req: { cookies: cookieStore, headers: {} } as unknown as Parameters<
        typeof getToken
      >[0]["req"],
      secureCookie,
      cookieName: secureCookie ? SECURE_COOKIE : PLAIN_COOKIE,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    return null;
  }
});

/**
 * The bearer token for API calls made on behalf of the signed-in person,
 * or null when there is no usable session.
 *
 * Mirrors the expiry rules of the `jwt` callback, except that an expired
 * impersonation never falls back to the staff member's own token: see
 * apiTokenOf (lib/session-api-token.ts).
 */
export async function getApiToken(): Promise<string | null> {
  return apiTokenOf(await getSessionToken());
}
