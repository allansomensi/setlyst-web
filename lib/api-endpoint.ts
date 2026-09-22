/**
 * Endpoint validation shared by the server-side (lib/api-server.ts) and
 * client-side (lib/api-client.ts) API callers. Isomorphic — no server- or
 * browser-only APIs.
 *
 * Almost every endpoint in this app is built by interpolating a value that
 * ultimately came from a URL:
 *
 *     fetchServerApi(`/setlists/${id}`)
 *     fetchServerApi(`/public/setlists/${token}`)
 *
 * Those values are route params, so they are attacker-chosen. A param
 * containing `..` — reachable through percent-encoding, since Next.js
 * decodes params before handing them over, so `%2E%2E%2F` arrives as
 * `../` — produces an endpoint like `/public/setlists/../../users/me`.
 * The URL parser in `fetch` resolves those segments away before the
 * request goes out, so the call quietly lands on a completely different
 * endpoint than the one written in the source, carrying whatever
 * `Authorization` header the real endpoint would have had.
 *
 * Validating here rather than at each of the ~60 call sites means the
 * guarantee can't be forgotten by the next endpoint someone adds, and it
 * holds for call sites that predate it.
 */

export class InvalidEndpointError extends Error {
  constructor(endpoint: string) {
    // Deliberately does not echo the endpoint back into the message: it
    // contains attacker-controlled text and these messages are surfaced
    // to the client by lib/action-guard.ts.
    super("Invalid API endpoint.");
    this.name = "InvalidEndpointError";
    this.endpoint = endpoint;
  }

  readonly endpoint: string;
}

/**
 * Throws unless `endpoint` is a safe, root-relative API path.
 *
 * Rejects:
 *  - anything not starting with a single `/` (absolute URLs, so an
 *    endpoint can never be redirected at another host — SSRF)
 *  - `//…`, which a URL parser reads as protocol-relative
 *  - any `.` or `..` path segment, which would re-target the request
 *  - backslashes, which some parsers normalize to `/`
 *  - control characters, which can split headers or truncate the path
 */
export function assertSafeEndpoint(endpoint: string): void {
  if (typeof endpoint !== "string" || !endpoint.startsWith("/")) {
    throw new InvalidEndpointError(String(endpoint));
  }

  if (endpoint.startsWith("//")) {
    throw new InvalidEndpointError(endpoint);
  }

  // Control characters can split headers or truncate the path; the
  // backslash is included because some URL parsers normalize it to "/".
  if (/[\u0000-\u001f\u007f\\]/.test(endpoint)) {
    throw new InvalidEndpointError(endpoint);
  }

  const [path] = endpoint.split(/[?#]/, 1);

  for (const segment of path.split("/")) {
    // Compare decoded, so `%2e%2e` is caught alongside a literal `..`.
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      // A malformed escape can't be decoded — treat it as hostile.
      throw new InvalidEndpointError(endpoint);
    }

    if (decoded === "." || decoded === "..") {
      throw new InvalidEndpointError(endpoint);
    }

    if (decoded.includes("/") || decoded.includes("\\")) {
      throw new InvalidEndpointError(endpoint);
    }
  }
}

/**
 * Builds an endpoint from a template, percent-encoding every interpolated
 * value so a route param can only ever be a single path segment:
 *
 *     apiPath`/public/setlists/${token}`
 *
 * Prefer this over a bare template literal for anything built from a route
 * param, a user-supplied id, or a share token. `assertSafeEndpoint` above
 * is the backstop that catches what this misses; this is the fix that
 * keeps such a value from being misread as a path in the first place.
 */
export function apiPath(
  strings: TemplateStringsArray,
  ...values: Array<string | number>
): string {
  return strings.reduce((acc, part, index) => {
    if (index === 0) return part;
    return acc + encodeURIComponent(String(values[index - 1])) + part;
  }, "");
}
