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
  matcher: ["/((?!api|_next/static|status|_next/image|favicon\\.ico).*)"],
};
