/**
 * The allowlist of `app/api/client/[...path]`: which method + API path
 * shapes the browser may reach through the server (which adds the bearer
 * token). Pure, so the matrix is unit tested.
 *
 * Deliberately an allowlist, not an open proxy. Extend `CLIENT_API_ROUTES`
 * when a client component needs another endpoint; prefer a server action
 * for mutations.
 */

const ID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

export const CLIENT_API_ROUTES: ReadonlyArray<{
  method: "GET" | "PATCH";
  pattern: RegExp;
}> = [
  { method: "GET", pattern: /^\/notifications$/ },
  { method: "GET", pattern: /^\/notifications\/unread-count$/ },
  { method: "PATCH", pattern: new RegExp(`^/notifications/${ID}/read$`) },
  { method: "PATCH", pattern: /^\/notifications\/read-all$/ },
  { method: "GET", pattern: /^\/users\/me\/preferences$/ },
  { method: "GET", pattern: /^\/(songs|artists|setlists|gigs|bands)$/ },
  { method: "GET", pattern: new RegExp(`^/songs/${ID}$`) },
  { method: "GET", pattern: new RegExp(`^/setlists/${ID}/(items|songs)$`) },
  { method: "GET", pattern: new RegExp(`^/bands/${ID}/(gigs|setlists)$`) },
];

/** Query keys forwarded to the API (everything else is dropped). */
export const CLIENT_API_QUERY_KEYS: ReadonlySet<string> = new Set([
  "page",
  "per_page",
  "q",
  "status",
  "scope",
  "type",
]);

/**
 * The API endpoint for the catch-all segments of a request, each segment
 * percent-encoded so an encoded `/`, `?` or `#` inside one stays inside it
 * (and then fails the allowlist).
 */
export function clientApiEndpoint(segments: readonly string[]): string {
  return `/${segments.map(encodeURIComponent).join("/")}`;
}

/** Whether `method` + `endpoint` is on the allowlist. */
export function isAllowedClientApiRoute(
  method: string,
  endpoint: string,
): boolean {
  const upper = method.toUpperCase();
  return CLIENT_API_ROUTES.some(
    (route) => route.method === upper && route.pattern.test(endpoint),
  );
}
