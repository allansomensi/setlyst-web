import "server-only";

import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import {
  ImageFetchError,
  safeImageFetch,
  type ImageFetchFailure,
} from "@/lib/server/safe-image-fetch";
import { TokenBucketLimiter } from "@/lib/server/token-bucket";

/** Headers every proxied image is served with (SPEC §10.1). */
const IMAGE_HEADERS = {
  "Cache-Control": "private, max-age=3600",
  "Content-Security-Policy": "default-src 'none'",
  "X-Content-Type-Options": "nosniff",
} as const;

/** How long a fetched image (or a permanent refusal) is reused: 1 day. */
const IMAGE_CACHE_SECONDS = 24 * 60 * 60;

/**
 * Refusals that won't change by asking again (the URL points at something
 * that isn't an acceptable image): remembered like a success, so a broken
 * avatar doesn't cost a remote fetch on every page view. Timeouts and
 * network failures are retried.
 */
const PERMANENT_FAILURES: ReadonlySet<ImageFetchFailure> = new Set([
  "invalid_url",
  "blocked_address",
  "too_many_redirects",
  "bad_status",
  "not_an_image",
  "too_large",
]);

/**
 * Requests per signed-in user per minute across both image routes: room
 * for a long member or user list (the browser caches each image for an
 * hour), not for a loop.
 */
const REQUESTS_PER_MINUTE = 120;
const limiter = new TokenBucketLimiter(REQUESTS_PER_MINUTE, 60_000);

type CachedImage =
  | { ok: true; contentType: string; base64: string }
  | { ok: false; reason: ImageFetchFailure };

/** "No image": the component falls back to initials. Never cached. */
export function noImage(
  status = 404,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { "Cache-Control": "private, no-store", ...extraHeaders },
  });
}

/**
 * Per-user brake on the image routes: each request can mean an API
 * lookup plus a remote fetch. Returns a 429 response when `userId` is
 * over its budget, null otherwise.
 */
export function limitImageRequests(userId: string): NextResponse | null {
  const wait = limiter.take(userId);
  return wait > 0 ? noImage(429, { "Retry-After": String(wait) }) : null;
}

async function fetchForCache(url: string): Promise<CachedImage> {
  try {
    const image = await safeImageFetch(url);
    return {
      ok: true,
      contentType: image.contentType,
      base64: Buffer.from(image.body).toString("base64"),
    };
  } catch (error) {
    const reason = error instanceof ImageFetchError ? error.reason : "network";
    if (PERMANENT_FAILURES.has(reason)) return { ok: false, reason };
    // Transient: thrown, so the Data Cache keeps nothing.
    throw error instanceof ImageFetchError
      ? error
      : new ImageFetchError(reason);
  }
}

/**
 * The image behind `url`, from the Next.js Data Cache when another request
 * fetched it in the last day. Keyed by a hash of the URL (never the URL
 * itself: it is user content). Falls back to a direct fetch when the cache
 * isn't available.
 */
async function loadImage(url: string): Promise<CachedImage> {
  const key = createHash("sha256").update(url).digest("hex");
  const cached = unstable_cache(
    () => fetchForCache(url),
    ["image-proxy", key],
    {
      revalidate: IMAGE_CACHE_SECONDS,
    },
  );
  try {
    return await cached();
  } catch (error) {
    if (error instanceof ImageFetchError) throw error;
    // The cache itself failed (no incremental cache in this context).
    return fetchForCache(url);
  }
}

/**
 * Fetches a user-supplied image URL through the SSRF-safe fetcher and
 * serves it from our origin (so the page's CSP can stay `img-src 'self'`).
 */
export async function serveRemoteImage(
  url: string | null | undefined,
): Promise<NextResponse> {
  if (!url) return noImage();

  let image: CachedImage;
  try {
    image = await loadImage(url);
  } catch (error) {
    image = {
      ok: false,
      reason: error instanceof ImageFetchError ? error.reason : "network",
    };
  }

  if (!image.ok) {
    // The URL is user content: log the reason, not the URL.
    console.warn("[image-proxy] refused:", image.reason);
    return noImage(image.reason === "timeout" ? 504 : 404);
  }

  const body = Buffer.from(image.base64, "base64");
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...IMAGE_HEADERS,
      "Content-Type": image.contentType,
      "Content-Length": String(body.byteLength),
    },
  });
}
