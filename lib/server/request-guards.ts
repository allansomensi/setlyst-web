/**
 * Pure request checks shared by the app's own route handlers (see
 * lib/server/api-route.ts). No Next.js imports, so they are unit tested.
 */

/**
 * Refuses a state-changing request that didn't come from one of our own
 * pages. The session cookie is `SameSite=Lax`, which already keeps it off
 * cross-site POSTs; this is the second lock on the same door.
 *
 * `Sec-Fetch-Site` wins when the browser sends it (every current one
 * does): only `same-origin` (our pages) and `none` (typed in the address
 * bar, a bookmark) pass; `same-site` does not, since a sibling subdomain is
 * not this app. Without it, the `Origin` must name this host.
 */
export function isSameOriginRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";

  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Copies only the allowed query keys (each value capped in length) into a
 * fresh query string. Unknown keys are dropped rather than rejected, so an
 * older client never breaks on a key the server stopped accepting.
 */
export function pickQuery(
  source: URLSearchParams,
  allowed: ReadonlySet<string>,
  maxValueLength = 200,
): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of source) {
    if (!allowed.has(key) || result.has(key)) continue;
    result.set(key, value.slice(0, maxValueLength));
  }
  return result;
}
