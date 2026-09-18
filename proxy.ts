import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const LOCALES = routing.locales as readonly string[];
const DEFAULT_LOCALE = routing.defaultLocale;

function getLocaleFromPath(pathname: string): string {
  const segment = pathname.split("/")[1] ?? "";
  return (LOCALES as string[]).includes(segment) ? segment : DEFAULT_LOCALE;
}

function stripLocale(pathname: string): string {
  const segment = pathname.split("/")[1] ?? "";
  if ((LOCALES as string[]).includes(segment)) {
    return pathname.slice(segment.length + 1) || "/";
  }
  return pathname;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const pathWithoutLocale = stripLocale(pathname);
  const locale = getLocaleFromPath(pathname);

  const isProtected = pathWithoutLocale.startsWith("/dashboard");
  const isAuthPage =
    pathWithoutLocale === "/login" ||
    pathWithoutLocale.startsWith("/login/") ||
    pathWithoutLocale === "/register" ||
    pathWithoutLocale.startsWith("/register/");

  if (isProtected || isAuthPage) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (isProtected) {
      if (!token || token.error === "TokenExpired") {
        const loginUrl = new URL(`/${locale}/login`, req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    if (isAuthPage) {
      if (token && !token.error) {
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
      }
    }
  }

  return intlMiddleware(req);
}

export const config = {
  // Static assets under public/ that the offline service worker depends on
  // must bypass this middleware entirely. next-intl's middleware treats any
  // matched path as a page and 307-redirects it to add a locale prefix
  // (e.g. "/sw.js" -> "/en/sw.js"). Two things break as a result:
  //  - `navigator.serviceWorker.register("/sw.js")` receives a redirected
  //    response, which the Service Worker spec disallows — registration
  //    fails outright, so the browser never controls the page and offline
  //    support silently stops working, even after a previously-successful
  //    install (a routine SW script re-check on navigation fails the same
  //    way).
  //  - the service worker's own `caches.addAll(["/offline.html"])` precache
  //    call gets redirected to a locale-prefixed path that doesn't exist
  //    (404), so the offline fallback page never actually gets cached.
  matcher: [
    "/((?!api|_next/static|_next/image|status|s/|g/|favicon\\.ico|sw\\.js|offline\\.html|manifest\\.json|icon\\.svg).*)",
  ],
};
