import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { assertSafeEndpoint, InvalidEndpointError } from "@/lib/api-endpoint";
import type { PaginatedResponse } from "@/types/api";
import {
  MAX_RETRIES,
  RETRYABLE_STATUSES,
  isIdempotentMethod,
  parseRetryAfterMs,
  retryDelayMs,
  sleep,
} from "@/lib/api-retry";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /**
     * How long the backend asked us to wait before trying again, when it
     * said so (a 429's `Retry-After`). Lets the UI tell someone *when* to
     * retry instead of just "later".
     */
    public retryAfterMs: number | null = null,
    /**
     * The API's stable error code (`QUOTA_EXCEEDED`, `WEAK_PASSWORD`...),
     * translated for display by lib/api-errors.ts.
     */
    public code: string | null = null,
    /** Structured context for `code` (limit reached, password issues...). */
    public meta: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Default timeout for every server-side API call (milliseconds). */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Returns the internal API base URL.
 * Uses API_URL (server-only) first, falls back to NEXT_PUBLIC_API_URL.
 * Never exposed to the browser bundle.
 */
function getApiBaseUrl(): string {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

  if (!url) {
    throw new ApiError(500, "API base URL is not configured.");
  }

  return url.replace(/\/$/, "");
}

/**
 * Validates that the endpoint is a safe, root-relative API path — it can
 * neither be redirected at another host (SSRF) nor re-targeted at a
 * different endpoint via `..` segments. See lib/api-endpoint.ts for why
 * that second case is reachable from ordinary route params.
 */
function validateEndpoint(endpoint: string): void {
  try {
    assertSafeEndpoint(endpoint);
  } catch (error) {
    if (error instanceof InvalidEndpointError) {
      console.error("[fetchServerApi] Rejected unsafe endpoint:", endpoint);
      throw new ApiError(400, "Invalid API endpoint.");
    }
    throw error;
  }
}

export async function fetchServerApi<T>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  validateEndpoint(endpoint);

  const session = await getServerSession(authOptions);
  const token = session?.user?.apiToken;

  const requestHeaders = new Headers(options.headers);
  requestHeaders.set("Content-Type", "application/json");
  requestHeaders.set("Accept", "application/json");

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  // Lets the backend fall back sensibly (e.g. a brand-new user's default
  // preferences) to the locale actually being rendered, instead of always
  // assuming English. Never overrides an already-saved preference.
  try {
    const locale = await getLocale();
    requestHeaders.set("x-app-locale", locale);
  } catch {}

  try {
    const nextHeaders = await headers();
    const forwardedFor = nextHeaders.get("x-forwarded-for");
    const realIp = nextHeaders.get("x-real-ip");

    if (forwardedFor) {
      requestHeaders.set("x-forwarded-for", forwardedFor);
    } else if (realIp) {
      requestHeaders.set("x-forwarded-for", realIp);
    }
  } catch {}

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const canRetryMethod = isIdempotentMethod(fetchOptions.method);

  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
        // Prevent SSRF by not following redirects automatically.
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const isTimeout =
        err instanceof DOMException && err.name === "TimeoutError";

      if (canRetryMethod && attempt < MAX_RETRIES) {
        attempt++;
        await sleep(retryDelayMs(attempt));
        continue;
      }

      if (isTimeout) {
        console.error(
          `[fetchServerApi] Request timed out after ${timeoutMs}ms:`,
          url,
        );
        throw new ApiError(504, "The backend service did not respond in time.");
      }
      console.error("[fetchServerApi] Network error:", err);
      throw new ApiError(503, "Unable to reach the backend service.");
    }

    if (!res.ok) {
      const canRetryStatus =
        res.status === 429 ||
        (canRetryMethod && RETRYABLE_STATUSES.has(res.status));

      if (canRetryStatus && attempt < MAX_RETRIES) {
        attempt++;
        const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
        await sleep(retryDelayMs(attempt, retryAfterMs));
        continue;
      }

      let message = `API error: ${res.status}`;
      let code: string | null = null;
      let meta: Record<string, unknown> | null = null;
      try {
        const body = await res.json();
        if (typeof body?.message === "string") message = body.message;
        if (typeof body?.code === "string") code = body.code;
        if (body?.meta && typeof body.meta === "object") meta = body.meta;
      } catch {
        // Non-JSON error body: keep the generic message.
      }

      let retryAfterMs: number | null = null;
      if (res.status === 429) {
        message = "Too many requests. Please wait a moment and try again.";
        retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
      }

      if (res.status === 401 && code !== "WRONG_PASSWORD") {
        message = "Unauthorized. Please sign in again.";
      }

      throw new ApiError(res.status, message, retryAfterMs, code, meta);
    }

    if (res.status === 204) return {} as T;

    return res.json();
  }
}

/** The API's own ceiling for `per_page`. */
const MAX_PAGE_SIZE = 100;
/** Safety valve: 50 pages × 100 rows is far beyond any real repertoire. */
const MAX_PAGES = 50;

/**
 * Every row of a paginated collection, as a single `PaginatedResponse`.
 *
 * List pages used to request `?page=1&per_page=100` and stop there, so the
 * 101st song, setlist or artist silently never appeared anywhere in the
 * app — not in its list, not in the "add song" picker, not in a setlist's
 * running order. The API caps `per_page` at 100, so the rest has to be
 * fetched page by page; after the first page tells us how many there are,
 * the remaining ones are requested in parallel.
 *
 * `path` must not carry its own `page`/`per_page`.
 */
export async function fetchAllServerPages<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<PaginatedResponse<T>> {
  const separator = path.includes("?") ? "&" : "?";
  const pageUrl = (page: number) =>
    `${path}${separator}page=${page}&per_page=${MAX_PAGE_SIZE}`;

  const first = await fetchServerApi<PaginatedResponse<T>>(pageUrl(1), options);
  const totalPages = Math.min(first.meta?.total_pages ?? 1, MAX_PAGES);
  if (totalPages <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchServerApi<PaginatedResponse<T>>(pageUrl(i + 2), options),
    ),
  );

  const data = [first, ...rest].flatMap((page) => page.data ?? []);
  return {
    data,
    meta: {
      ...first.meta,
      current_page: 1,
      per_page: data.length,
      total_pages: 1,
    },
  };
}
