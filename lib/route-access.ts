/**
 * Pure routing decisions for proxy.ts: which area of the app a path
 * belongs to, and therefore whether it needs a session. Kept apart from
 * the middleware (which depends on Next.js request objects) so it can be
 * unit tested (lib/__tests__/route-access.test.ts).
 */

import { safeCallbackPath } from "./links";

export type RouteKind =
  /** Signed-in area (`/dashboard/**`). */
  | "protected"
  /** Mandatory password change screen. */
  | "changePassword"
  /** Sign-in and sign-up: signed-in visitors are sent to the dashboard. */
  | "auth"
  /**
   * The public site: landing, pricing, changelog, contact, legal texts,
   * community guidelines, unsubscribe. Open to everyone; signed-in visitors are
   * never redirected away.
   */
  | "public"
  /** Anything else (password recovery, not-found pages...). */
  | "other";

/** Public site paths, without the locale prefix. */
const PUBLIC_EXACT = new Set([
  "/",
  "/pricing",
  "/changelog",
  "/contato",
  "/unsubscribe",
]);
const PUBLIC_PREFIXES = ["/legal", "/community-guidelines"];

function matchesSegment(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Leading locale segment of `pathname`, when it is a supported one. */
export function getLocaleSegment(
  pathname: string,
  locales: readonly string[],
): string | null {
  const segment = pathname.split("/")[1] ?? "";
  return locales.includes(segment) ? segment : null;
}

/** `pathname` without its locale prefix (`/pt-BR/pricing` → `/pricing`). */
export function stripLocale(
  pathname: string,
  locales: readonly string[],
): string {
  const segment = getLocaleSegment(pathname, locales);
  return segment ? pathname.slice(segment.length + 1) || "/" : pathname;
}

/** Classifies a locale-less path (see `stripLocale`). */
export function classifyPath(pathWithoutLocale: string): RouteKind {
  const path =
    pathWithoutLocale.length > 1 && pathWithoutLocale.endsWith("/")
      ? pathWithoutLocale.slice(0, -1)
      : pathWithoutLocale;

  if (matchesSegment(path, "/dashboard")) return "protected";
  if (matchesSegment(path, "/change-password")) return "changePassword";
  if (matchesSegment(path, "/login") || matchesSegment(path, "/register")) {
    return "auth";
  }
  if (
    PUBLIC_EXACT.has(path) ||
    PUBLIC_PREFIXES.some((prefix) => matchesSegment(path, prefix))
  ) {
    return "public";
  }
  return "other";
}

/** Whether the public site may be served for this path without a session. */
export function isPublicPath(pathWithoutLocale: string): boolean {
  return classifyPath(pathWithoutLocale) === "public";
}

/** Longest `callbackUrl` kept (safeCallbackPath refuses longer ones). */
const MAX_CALLBACK_LENGTH = 2048;

/**
 * The `callbackUrl` the login page receives when a signed-out visitor
 * opens a protected page: the path *and* its query (`?songId=` in Live
 * Mode, `?checkout=` in settings), so signing in lands exactly where the
 * person was going. A query too long to carry is dropped, keeping the
 * page.
 */
export function loginCallbackOf(pathname: string, search: string): string {
  const full = `${pathname}${search}`;
  return full.length <= MAX_CALLBACK_LENGTH ? full : pathname;
}

/**
 * Where a signed-in visitor of the login or sign-up page is sent: the
 * `callbackUrl` it carries, when it is a safe in-app path that isn't
 * itself a sign-in page (which would loop), otherwise the dashboard.
 * A path without a locale gets `locale`.
 */
export function signedInRedirectPath(
  callbackUrl: string | null | undefined,
  locale: string,
  locales: readonly string[],
): string {
  const fallback = `/${locale}/dashboard`;
  const safe = safeCallbackPath(callbackUrl);
  if (!safe) return fallback;

  const [pathname] = safe.split(/[?#]/, 1);
  const kind = classifyPath(stripLocale(pathname, locales));
  if (kind === "auth") return fallback;

  return getLocaleSegment(pathname, locales) ? safe : `/${locale}${safe}`;
}

/**
 * Dashboard paths a staff account without two-factor authentication can
 * still open: the settings page, where it is turned on.
 */
export function isStaffTwoFactorExempt(pathWithoutLocale: string): boolean {
  return (
    pathWithoutLocale === "/dashboard/settings" ||
    pathWithoutLocale.startsWith("/dashboard/settings/")
  );
}
