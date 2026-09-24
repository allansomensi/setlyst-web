import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { routing } from "./i18n/routing";
import {
  classifyPath,
  getLocaleSegment,
  isStaffTwoFactorExempt,
  loginCallbackOf,
  signedInRedirectPath,
  stripLocale,
} from "./lib/route-access";
import { buildCsp, cspEnvironment, generateNonce } from "./lib/csp";
import { isSessionExpired } from "./lib/session-api-token";

const intlMiddleware = createMiddleware(routing);

const LOCALES = routing.locales as readonly string[];
const DEFAULT_LOCALE = routing.defaultLocale;

/** The cookie next-intl reads when resolving a locale — see LOCALE_COOKIE below. */
const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isSupportedLocale(value: unknown): value is string {
  return typeof value === "string" && LOCALES.includes(value);
}

/**
 * The locale this request should be served in, when the URL itself doesn't
 * say — in preference order:
 *
 *  1. The `NEXT_LOCALE` cookie, which records a choice made explicitly in
 *     the app (the settings page writes it; see the settings action).
 *  2. The language saved on the account, carried in the session token
 *     since sign-in (see lib/auth.ts).
 *
 * Returning null hands the decision back to next-intl, which falls back to
 * the `Accept-Language` header and then the default locale.
 *
 * Without step 2 a freshly installed PWA — which launches at its
 * locale-less `start_url` with no cookie yet — is resolved purely from the
 * browser's own language, so an account set to Portuguese would open in
 * English until the person toggled the setting to something else and back
 * (the only path that used to write the cookie). That is the bug this
 * function exists to close.
 */
function resolvePreferredLocale(
  req: NextRequest,
  token: JWT | null,
): string | null {
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  if (isSupportedLocale(token?.language)) return token.language;

  return null;
}

const CSP_ENV = cspEnvironment();

/**
 * Marks every page rendered while a staff member views the app as someone
 * else. The service worker refuses to store such a response (public/sw.js),
 * so the viewed account's pages never end up in the staff member's
 * offline cache.
 */
const IMPERSONATION_HEADER = "x-setlyst-impersonating";

function isStaffRole(role: unknown): boolean {
  return role === "admin" || role === "moderator";
}

/**
 * Public pages outside the locale segment (share links, status page,
 * the link-preview image):
 * they only need the per-request CSP, never the auth gate or next-intl's
 * locale redirect.
 */
function isLocaleFreePage(pathname: string): boolean {
  return (
    pathname.startsWith("/s/") ||
    pathname.startsWith("/g/") ||
    pathname === "/status" ||
    pathname.startsWith("/status/") ||
    // The generated link-preview image (app/opengraph-image.tsx) lives at
    // the root; a locale redirect would make it 404.
    pathname === "/opengraph-image"
  );
}

/**
 * Every page gets its own nonce: Next.js reads it from the request's
 * `Content-Security-Policy` header and adds it to its scripts, and server
 * components read `x-nonce` (lib/server/nonce.ts) for the few inline
 * scripts of their own (next-themes). The same policy goes on the response.
 */
export default async function middleware(incoming: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(CSP_ENV, nonce);
  const requestHeaders = new Headers(incoming.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const req = new NextRequest(incoming, { headers: requestHeaders });

  const response = await route(req, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

async function route(
  req: NextRequest,
  requestHeaders: Headers,
): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (isLocaleFreePage(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const pathWithoutLocale = stripLocale(pathname, LOCALES);
  const localeSegment = getLocaleSegment(pathname, LOCALES);
  const hasLocalePrefix = localeSegment !== null;

  // The public site (landing, pricing, changelog, legal texts,
  // unsubscribe) is classified "public": it never needs a session and a
  // signed-in visitor is never redirected away from it. See
  // lib/route-access.ts.
  const kind = classifyPath(pathWithoutLocale);
  const isProtected = kind === "protected";
  const isChangePassword = kind === "changePassword";
  const isAuthPage = kind === "auth";

  // Resolved once and shared by the auth gate and the locale fallback
  // below, so a request never decrypts the session token twice.
  const needsToken =
    isProtected || isAuthPage || isChangePassword || !hasLocalePrefix;
  const token = needsToken
    ? await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    : null;

  // The locale every redirect below is built with. Resolved *before* the
  // auth gate rather than after it: a URL with no locale prefix used to
  // fall straight back to the default, so someone whose account is set to
  // Portuguese, opening the app at a locale-less URL while signed out,
  // was sent to the English login page.
  const locale = localeSegment ?? resolvePreferredLocale(req, token);

  // A session is usable only while the API token it carries is: see
  // isSessionExpired for why `token.error` alone isn't enough here.
  const expired = isSessionExpired(token);
  const session = expired ? null : token;

  if ((isProtected || isChangePassword) && !session) {
    const loginUrl = new URL(
      `/${locale ?? DEFAULT_LOCALE}/login`,
      req.nextUrl.origin,
    );
    loginUrl.searchParams.set(
      "callbackUrl",
      loginCallbackOf(pathname, req.nextUrl.search),
    );
    // A session that existed and ran out: the login page clears the
    // offline copy of the account's data (see LoginForm).
    if (token) loginUrl.searchParams.set("reason", "expired");
    return NextResponse.redirect(loginUrl);
  }

  // An account flagged for a mandatory password change (temporary
  // password, or one below the current policy) can't reach anything else
  // until it's done — the API refuses every other call anyway.
  if (isProtected && session?.mustChangePassword) {
    return NextResponse.redirect(
      new URL(
        `/${locale ?? DEFAULT_LOCALE}/change-password`,
        req.nextUrl.origin,
      ),
    );
  }

  // Two-factor authentication is mandatory for staff: until it's on, the
  // API refuses everything but the account's own security endpoints
  // (STAFF_TWO_FACTOR_REQUIRED), so the dashboard would be a wall of
  // errors. Such an account is kept on the security settings, which
  // explain why.
  if (
    isProtected &&
    session &&
    !session.impersonator &&
    isStaffRole(session.role) &&
    session.twoFactorEnabled === false &&
    !isStaffTwoFactorExempt(pathWithoutLocale)
  ) {
    const target = new URL(
      `/${locale ?? DEFAULT_LOCALE}/dashboard/settings`,
      req.nextUrl.origin,
    );
    target.searchParams.set("section", "security");
    target.searchParams.set("reason", "staff2fa");
    return NextResponse.redirect(target);
  }

  if (isChangePassword && session && !session.mustChangePassword) {
    return NextResponse.redirect(
      new URL(`/${locale ?? DEFAULT_LOCALE}/dashboard`, req.nextUrl.origin),
    );
  }

  // Already signed in: straight to where the sign-in would have led (an
  // invite link, Live Mode...), not blindly to the dashboard.
  if (isAuthPage && session) {
    return NextResponse.redirect(
      new URL(
        signedInRedirectPath(
          req.nextUrl.searchParams.get("callbackUrl"),
          locale ?? DEFAULT_LOCALE,
          LOCALES,
        ),
        req.nextUrl.origin,
      ),
    );
  }

  // No locale in the URL: send the person to their preferred one rather
  // than letting `Accept-Language` decide, and remember it so every later
  // request — including ones this middleware never sees — agrees.
  //
  // When nothing authoritative is known, fall through to next-intl, which
  // negotiates from the `Accept-Language` header as before. Guessing the
  // default here instead would overwrite a perfectly good header match.
  if (!hasLocalePrefix && locale) {
    const target = new URL(req.nextUrl.href);
    target.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

    const response = NextResponse.redirect(target);
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return response;
  }

  const response = intlMiddleware(req);
  if (isProtected && session?.impersonator) {
    response.headers.set(IMPERSONATION_HEADER, "1");
  }
  return response;
}

export const config = {
  // Static assets must bypass this middleware entirely. next-intl's
  // middleware treats any matched path as a page and 307-redirects it to
  // add a locale prefix (e.g. "/sw.js" -> "/en/sw.js"), which breaks:
  //  - `navigator.serviceWorker.register("/sw.js")`, which receives a
  //    redirected response — disallowed by the Service Worker spec, so
  //    registration fails outright and offline support silently stops
  //    working, even after a previously-successful install.
  //  - the service worker's own `caches.addAll(["/offline.html"])`, which
  //    would be redirected to a locale-prefixed path that 404s.
  //  - the App Router's generated icon routes (`/icon0.svg`,
  //    `/apple-icon.png`, …), which exist only at the root.
  //
  // Only root-level files with a known static extension are skipped (see
  // MIDDLEWARE_MATCHER in lib/csp.ts, which this literal must equal; Next.js
  // reads it statically). A page URL that merely contains a dot, such as
  // /pt-BR/dashboard/tours/abc.def, still goes through the auth gate.
  // Skipped paths get the static fallback CSP from next.config.ts.
  matcher: [
    "/((?!api/|api$|_next/|[^/]+\\.(?:js|mjs|css|map|json|webmanifest|txt|xml|html|ico|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|otf)$).*)",
  ],
};
