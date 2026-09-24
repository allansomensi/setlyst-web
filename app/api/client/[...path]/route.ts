import type { NextRequest } from "next/server";
import {
  badRequest,
  forwardToApi,
  isSameOriginRequest,
  jsonError,
  pickQuery,
} from "@/lib/server/api-route";
import {
  CLIENT_API_QUERY_KEYS,
  clientApiEndpoint,
  isAllowedClientApiRoute,
} from "@/lib/server/client-api-routes";

/**
 * The browser's door to the API for the few calls that run client-side
 * (notification bell, offline sync, lyrics editor). The browser only has
 * its session cookie; this handler adds the bearer token server-side, so
 * the token itself never reaches the page (audit M6).
 *
 * Deliberately an allowlist, not an open proxy: only the method + path
 * shapes in lib/server/client-api-routes.ts are forwarded.
 */

/** Largest JSON body forwarded (none of the allowed calls need more). */
const MAX_BODY_BYTES = 64 * 1024;

async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const endpoint = clientApiEndpoint(path);
  const method = request.method.toUpperCase();

  if (!isAllowedClientApiRoute(method, endpoint)) {
    return jsonError(404, "NOT_FOUND", "Unknown endpoint.");
  }

  if (method !== "GET" && !isSameOriginRequest(request)) {
    return jsonError(403, "FORBIDDEN", "Cross-site request refused.");
  }

  const query = pickQuery(request.nextUrl.searchParams, CLIENT_API_QUERY_KEYS);
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
