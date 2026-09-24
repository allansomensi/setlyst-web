import type { NextRequest } from "next/server";
import {
  forwardToApi,
  isSameOriginRequest,
  jsonError,
  pickQuery,
  unauthorized,
} from "@/lib/server/api-route";
import { getApiToken } from "@/lib/server/api-token";
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

function tooLarge() {
  return jsonError(413, "PAYLOAD_TOO_LARGE", "Body too large.", {
    limit_bytes: MAX_BODY_BYTES,
  });
}

/**
 * Reads at most `MAX_BODY_BYTES` of the request body, counting bytes as
 * they arrive (never the length of a decoded string, which undercounts
 * multi-byte text). `null` once the limit is passed, so a body that
 * lies about (or omits) its Content-Length is dropped where it is
 * instead of being buffered whole.
 */
async function readLimitedBody(request: NextRequest): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

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
    // A declared size over the limit is refused before anything is read,
    // and nothing is buffered for a caller without a session: an
    // anonymous request must not get to fill the process's memory.
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return tooLarge();
    }
    if (!(await getApiToken())) return unauthorized();
    const text = await readLimitedBody(request);
    if (text === null) return tooLarge();
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
