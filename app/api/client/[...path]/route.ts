import type { NextRequest } from "next/server";
import {
  badRequest,
  forwardToApi,
  isSameOriginRequest,
  jsonError,
  pickQuery,
} from "@/lib/server/api-route";

/**
 * The browser's door to the API for the few calls that run client-side
 * (notification bell, offline sync, lyrics editor). The browser only has
 * its session cookie; this handler adds the bearer token server-side, so
 * the token itself never reaches the page (audit M6).
 *
 * Deliberately an allowlist, not an open proxy: only the method + path
 * shapes below are forwarded. Extend `ROUTES` when a client component
 * needs another endpoint; prefer a server action for mutations.
 */

const ID = "[0-9a-fA-F-]{36}";

const ROUTES: ReadonlyArray<{ method: string; pattern: RegExp }> = [
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

const QUERY_KEYS = new Set([
  "page",
  "per_page",
  "q",
  "status",
  "scope",
  "type",
]);

/** Largest JSON body forwarded (none of the allowed calls need more). */
const MAX_BODY_BYTES = 64 * 1024;

async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const endpoint = `/${path.map(encodeURIComponent).join("/")}`;
  const method = request.method.toUpperCase();

  if (!ROUTES.some((r) => r.method === method && r.pattern.test(endpoint))) {
    return jsonError(404, "NOT_FOUND", "Unknown endpoint.");
  }

  if (method !== "GET" && !isSameOriginRequest(request)) {
    return jsonError(403, "FORBIDDEN", "Cross-site request refused.");
  }

  const query = pickQuery(request.nextUrl.searchParams, QUERY_KEYS);
  const target = query.size ? `${endpoint}?${query}` : endpoint;

  let body: string | undefined;
  if (method !== "GET") {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return badRequest("Body too large.");
    body = text || undefined;
  }

  return forwardToApi(target, {
    method: method as "GET" | "PATCH",
    body,
    contentType: body ? "application/json" : undefined,
    accept: "application/json",
    timeoutMs: 15_000,
  });
}

export { handle as GET, handle as PATCH };
