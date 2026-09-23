/**
 * Shared retry policy for both server-side (lib/api-server.ts) and
 * client-side (lib/api-client.ts) API calls. Isomorphic — no server- or
 * browser-only APIs — so both can import it directly.
 *
 * The backend rate-limits by IP, and a working musician's library (dozens
 * of setlists/songs, several bands) naturally means many calls in a short
 * window — normal use, not abuse, but enough to occasionally trip it or
 * hit a transient timeout. Without a retry, a single one of those took
 * whichever page depended on it down to the generic error boundary. A
 * short, bounded retry absorbs that transparently in the case that
 * matters most: someone just navigating, waiting on this response.
 */
export const MAX_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 300;

/** Statuses worth retrying — but only for methods where doing so is safe (see isIdempotentMethod). */
export const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]);

/**
 * Whether retrying this method can't create a duplicate. A network error,
 * timeout, 429 or 5xx is ambiguous for a non-idempotent write (POST,
 * PATCH): the request may have gone through, and a 429 may be a business
 * rule (`TOO_MANY_ATTEMPTS` on a code check, `ACCOUNT_LOCKED` on a
 * sign-in) rather than the IP rate limiter. So only methods where sending
 * the request again can't double up its effect are ever retried.
 */
export function isIdempotentMethod(method: string | undefined): boolean {
  return IDEMPOTENT_METHODS.has((method ?? "GET").toUpperCase());
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parses a `Retry-After` header (seconds, or an HTTP date) into milliseconds. */
export function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

/** The delay before retry number `attempt` (1-indexed): the server's own Retry-After if it gave one, else exponential backoff. */
export function retryDelayMs(
  attempt: number,
  retryAfterMs?: number | null,
): number {
  return retryAfterMs ?? RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
}

/**
 * Longest `Retry-After` worth waiting for inside a request. Anything longer
 * (a 60 s cooldown, a 15 min lockout) is surfaced to the caller at once,
 * with the wait, instead of holding the page.
 */
export const MAX_RETRY_WAIT_MS = 5_000;

/**
 * How long to wait before retrying a failed response, or `null` to give
 * up and surface the error: never for non-idempotent methods, only for
 * retryable statuses, at most `MAX_RETRIES` times, and honouring the
 * server's `Retry-After` when it gives one (unless it exceeds
 * `MAX_RETRY_WAIT_MS`).
 */
export function statusRetryDelayMs(
  method: string | undefined,
  status: number,
  retryAfterHeader: string | null,
  attempt: number,
): number | null {
  if (!isIdempotentMethod(method) || !RETRYABLE_STATUSES.has(status)) {
    return null;
  }
  if (attempt > MAX_RETRIES) return null;
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  if (retryAfterMs !== null && retryAfterMs > MAX_RETRY_WAIT_MS) return null;
  return retryDelayMs(attempt, retryAfterMs);
}
