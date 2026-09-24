import "server-only";

import { NextResponse } from "next/server";
import { assertSafeEndpoint } from "@/lib/api-endpoint";
import { getApiBaseUrl } from "@/lib/api-server";
import { getApiToken } from "@/lib/server/api-token";
import { getInternalApiHeaders } from "@/lib/server/internal-api";
import { isUuid } from "@/lib/uuid";
import { isSameOriginRequest, pickQuery } from "@/lib/server/request-guards";

/**
 * Building blocks for the app's own route handlers (`app/api/export/*`,
 * `app/api/import/*`, `app/api/client/*`): the browser talks to these with
 * its session cookie, and they call the API with the bearer token that
 * only the server can read (see lib/server/api-token.ts).
 */

export { isUuid, isSameOriginRequest, pickQuery };

const NO_STORE = "private, no-store";

/** A JSON error in the API's own `{ code, message, meta? }` shape. */
export function jsonError(
  status: number,
  code: string,
  message: string,
  meta?: Record<string, unknown> | null,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { code, message, ...(meta ? { meta } : {}) },
    { status, headers: { "Cache-Control": NO_STORE, ...extraHeaders } },
  );
}

export const unauthorized = () =>
  jsonError(401, "SESSION_REVOKED", "Sign in again.");
export const badRequest = (message = "Invalid request.") =>
  jsonError(400, "BAD_REQUEST", message);

interface ForwardOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | null;
  contentType?: string;
  accept?: string;
  timeoutMs?: number;
  /**
   * Public endpoints (share links): called without the visitor's bearer
   * token, so it works signed out too.
   */
  anonymous?: boolean;
}

/** Headers of an API response that are safe and useful to pass along. */
const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-disposition",
  "content-length",
  "retry-after",
];

/**
 * Calls the API as the signed-in person and returns its answer as-is:
 * files are streamed (with the API's `Content-Disposition`), JSON errors
 * keep their `{ code, message, meta }` body so the client can translate
 * them. 5xx bodies are replaced by a generic message.
 */
export async function forwardToApi(
  endpoint: string,
  options: ForwardOptions = {},
): Promise<Response> {
  try {
    assertSafeEndpoint(endpoint);
  } catch {
    return badRequest();
  }

  const token = options.anonymous ? null : await getApiToken();
  if (!token && !options.anonymous) return unauthorized();

  const headers = new Headers(await getInternalApiHeaders());
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", options.accept ?? "*/*");
  if (options.contentType) headers.set("Content-Type", options.contentType);

  let upstream: Response;
  try {
    // getApiBaseUrl throws when the API URL isn't configured, which lands
    // in the same "unavailable" answer as a network failure.
    upstream = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ?? undefined,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
      // Required by undici to stream a request body.
      ...(options.body instanceof ReadableStream ? { duplex: "half" } : {}),
    } as RequestInit);
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return jsonError(
      timedOut ? 504 : 503,
      timedOut ? "TIMEOUT" : "UNAVAILABLE",
      "The backend service is not responding.",
    );
  }

  if (upstream.status >= 500) {
    // Never echo an internal error body; keep the status (503 carries
    // meaning, e.g. SERVICE_BUSY with a retry hint).
    let code = "SERVER_ERROR";
    let meta: Record<string, unknown> | null = null;
    try {
      const body = (await upstream.json()) as {
        code?: unknown;
        meta?: unknown;
      };
      if (body.code === "SERVICE_BUSY") {
        code = body.code;
        meta = (body.meta as Record<string, unknown>) ?? null;
      }
    } catch {
      // Not JSON.
    }
    const retryAfter = upstream.headers.get("retry-after");
    return jsonError(
      upstream.status,
      code,
      "The backend service failed.",
      meta,
      retryAfter ? { "Retry-After": retryAfter } : undefined,
    );
  }

  const responseHeaders = new Headers({
    "Cache-Control": NO_STORE,
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  if (upstream.status === 204) {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
