import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const LOCALES = routing.locales as readonly string[];
const DEFAULT_LOCALE = routing.defaultLocale;

/** The cookie next-intl reads when resolving a locale — see LOCALE_COOKIE below. */
const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getLocaleSegment(pathname: string): string | null {
  const segment = pathname.split("/")[1] ?? "";
  return LOCALES.includes(segment) ? segment : null;
}

function stripLocale(pathname: string): string {
  const segment = getLocaleSegment(pathname);
  return segment ? pathname.slice(segment.length + 1) || "/" : pathname;
}

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

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const pathWithoutLocale = stripLocale(pathname);
  const localeSegment = getLocaleSegment(pathname);
  const hasLocalePrefix = localeSegment !== null;

  const isProtected = pathWithoutLocale.startsWith("/dashboard");
  const isAuthPage =
    pathWithoutLocale === "/login" ||
    pathWithoutLocale.startsWith("/login/") ||
    pathWithoutLocale === "/register" ||
    pathWithoutLocale.startsWith("/register/");

  // Resolved once and shared by the auth gate and the locale fallback
  // below, so a request never decrypts the session token twice.
  const needsToken = isProtected || isAuthPage || !hasLocalePrefix;
  const token = needsToken
    ? await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    : null;

  // The locale every redirect below is built with. Resolved *before* the
  // auth gate rather than after it: a URL with no locale prefix used to
  // fall straight back to the default, so someone whose account is set to
  // Portuguese, opening the app at a locale-less URL while signed out,
  // was sent to the English login page.
  const locale = localeSegment ?? resolvePreferredLocale(req, token);

  if (isProtected && (!token || token.error === "TokenExpired")) {
    const loginUrl = new URL(
      `/${locale ?? DEFAULT_LOCALE}/login`,
      req.nextUrl.origin,
    );
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token && !token.error) {
    return NextResponse.redirect(
      new URL(`/${locale ?? DEFAULT_LOCALE}/dashboard`, req.nextUrl.origin),
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

  return intlMiddleware(req);
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
  // Matching on "any path segment containing a dot" covers all of them at
  // once, including files added later, instead of a hand-maintained list
  // that silently falls out of date — which is exactly how the icon
  // routes started 404ing.
  matcher: [
    "/((?!api|_next/static|_next/image|status|s/|g/|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
