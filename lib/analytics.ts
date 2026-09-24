/**
 * What page-view analytics may record of a URL. Pure, so it is unit
 * tested; used by components/analytics.tsx.
 *
 * Some URLs carry a credential: public share links (`/s/{token}`,
 * `/g/{token}`) and band invites (`/dashboard/invite/{code}`) grant access
 * to whoever holds them, and a `callbackUrl` can embed one of those. They
 * are replaced by a placeholder before anything leaves the browser.
 */

/** Path segments whose *next* segment is a secret. */
const SECRET_AFTER = new Set(["s", "g", "invite"]);

/** Query parameters that are dropped entirely. */
const SECRET_PARAMS = new Set([
  "callbackUrl",
  "token",
  "code",
  "ref",
  "google_error",
  "error",
  "email",
]);

export const REDACTED = ":redacted";

export function redactAnalyticsUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw, "https://placeholder.invalid");
  } catch {
    return raw;
  }

  const segments = url.pathname.split("/");
  for (let i = 1; i < segments.length - 1; i += 1) {
    if (SECRET_AFTER.has(segments[i]) && segments[i + 1]) {
      segments[i + 1] = REDACTED;
    }
  }
  url.pathname = segments.join("/");

  for (const key of [...url.searchParams.keys()]) {
    if (SECRET_PARAMS.has(key)) url.searchParams.delete(key);
  }
  url.hash = "";

  const relative = !/^[a-z][a-z0-9+.-]*:/i.test(raw);
  return relative
    ? `${url.pathname}${url.search}`
    : `${url.origin}${url.pathname}${url.search}`;
}
