import { headers } from "next/headers";
import { assertSafeEndpoint } from "@/lib/api-endpoint";
import type { PublicPlan, ReleaseNote, UnsubscribeInfo } from "@/types/public";

/**
 * Unauthenticated calls to the API's `/public/*` endpoints, for the public
 * site. Unlike `fetchServerApi` these never carry a session token (they
 * must render the same for everyone, so they can be cached) and never
 * throw: a failed call answers `null` and the page shows a fallback, so
 * the landing page and the legal texts stay up while the API is down.
 */

const TIMEOUT_MS = 8_000;

function apiBaseUrl(): string | null {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  return url ? url.replace(/\/$/, "") : null;
}

/**
 * Identifies the visitor to the API's per-IP rate limiter (SPEC §9 H1),
 * for the uncached calls made on the visitor's behalf.
 */
async function clientIpHeaders(): Promise<Record<string, string>> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return {};
  const h = await headers();
  const ip =
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? { "X-Setlyst-Internal": secret, "X-Setlyst-Client-IP": ip } : {};
}

type PublicFetchOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Seconds to cache the response for; `false` = never cache. */
  revalidate?: number | false;
  /** Send the visitor's IP to the API (uncached calls only). */
  forwardClientIp?: boolean;
};

export type PublicResult<T> =
  { ok: true; data: T } | { ok: false; status: number | null };

export async function fetchPublicApi<T>(
  endpoint: string,
  {
    method = "GET",
    body,
    revalidate = false,
    forwardClientIp = false,
  }: PublicFetchOptions = {},
): Promise<PublicResult<T>> {
  const base = apiBaseUrl();
  if (!base) return { ok: false, status: null };
  assertSafeEndpoint(endpoint);

  try {
    const response = await fetch(`${base}${endpoint}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(forwardClientIp ? await clientIpHeaders() : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(revalidate === false
        ? { cache: "no-store" as const }
        : { next: { revalidate } }),
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: null };
  }
}

/** Public plans in display order, or `null` when the API can't be reached. */
export async function getPublicPlans(): Promise<PublicPlan[] | null> {
  const result = await fetchPublicApi<PublicPlan[]>("/public/plans", {
    revalidate: 300,
  });
  if (!result.ok || !Array.isArray(result.data)) return null;
  return [...result.data].sort((a, b) => a.sort_order - b.sort_order);
}

/** Published release notes, newest first, or `null` on failure. */
export async function getPublicReleaseNotes(): Promise<ReleaseNote[] | null> {
  const result = await fetchPublicApi<ReleaseNote[]>("/public/release-notes", {
    revalidate: 300,
  });
  return result.ok && Array.isArray(result.data) ? result.data : null;
}

/** What an unsubscribe token refers to (`null` when the API is down). */
export async function inspectUnsubscribeToken(
  token: string,
): Promise<UnsubscribeInfo | null> {
  const query = new URLSearchParams({ token }).toString();
  const result = await fetchPublicApi<UnsubscribeInfo>(
    `/public/email/unsubscribe?${query}`,
    { forwardClientIp: true },
  );
  return result.ok ? result.data : null;
}
