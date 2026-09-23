/**
 * Pure routing decisions for proxy.ts: which area of the app a path
 * belongs to, and therefore whether it needs a session. Kept apart from
 * the middleware (which depends on Next.js request objects) so it can be
 * unit tested (lib/__tests__/route-access.test.ts).
 */

export type RouteKind =
  /** Signed-in area (`/dashboard/**`). */
  | "protected"
  /** Mandatory password change screen. */
  | "changePassword"
  /** Sign-in and sign-up: signed-in visitors are sent to the dashboard. */
  | "auth"
  /**
   * The public site: landing, pricing, changelog, legal texts, community
   * guidelines, unsubscribe. Open to everyone; signed-in visitors are
   * never redirected away.
   */
  | "public"
  /** Anything else (password recovery, not-found pages...). */
  | "other";

/** Public site paths, without the locale prefix. */
const PUBLIC_EXACT = new Set(["/", "/pricing", "/changelog", "/unsubscribe"]);
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
