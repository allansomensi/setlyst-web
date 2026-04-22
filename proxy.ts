import createMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const authMiddleware = withAuth(
  async function middleware(req: NextRequest) {
    const token = await getToken({ req });

    if (token?.error === "TokenExpired") {
      const locale = req.nextUrl.pathname.split("/")[1] ?? "en";
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return intlMiddleware(req);
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const pathnameWithoutLocale = pathname.replace(/^\/(en|pt-BR|es)/, "");

  const isProtected = pathnameWithoutLocale.startsWith("/dashboard");
  const isAuthPage =
    pathnameWithoutLocale.startsWith("/login") ||
    pathnameWithoutLocale.startsWith("/register");

  if (isProtected) {
    return (
      authMiddleware as unknown as (req: NextRequest) => Promise<NextResponse>
    )(req);
  }

  if (isAuthPage) {
    const token = await getToken({ req });
    if (token) {
      const locale = pathname.split("/")[1] ?? "en";
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Match all pathnames except static files, api, _next
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
