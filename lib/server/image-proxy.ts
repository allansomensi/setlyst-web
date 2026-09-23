import "server-only";

import { NextResponse } from "next/server";
import { ImageFetchError, safeImageFetch } from "@/lib/server/safe-image-fetch";

/** Headers every proxied image is served with (SPEC §10.1). */
const IMAGE_HEADERS = {
  "Cache-Control": "private, max-age=3600",
  "Content-Security-Policy": "default-src 'none'",
  "X-Content-Type-Options": "nosniff",
} as const;

/** "No image": the component falls back to initials. Never cached. */
export function noImage(status = 404): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

/**
 * Fetches a user-supplied image URL through the SSRF-safe fetcher and
 * serves it from our origin (so the page's CSP can stay `img-src 'self'`).
 */
export async function serveRemoteImage(
  url: string | null | undefined,
): Promise<NextResponse> {
  if (!url) return noImage();

  try {
    const image = await safeImageFetch(url);
    return new NextResponse(Buffer.from(image.body), {
      status: 200,
      headers: {
        ...IMAGE_HEADERS,
        "Content-Type": image.contentType,
        "Content-Length": String(image.body.byteLength),
      },
    });
  } catch (error) {
    const reason =
      error instanceof ImageFetchError ? error.reason : "unexpected";
    // The URL is user content: log the reason, not the URL.
    console.warn("[image-proxy] refused:", reason);
    return noImage(reason === "timeout" ? 504 : 404);
  }
}
