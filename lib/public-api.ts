import "server-only";

import { cache } from "react";
import { assertSafeEndpoint } from "@/lib/api-endpoint";
import { getInternalApiHeaders } from "@/lib/server/internal-api";
import { isBillingEnforced } from "@/lib/pricing";
import { parsePlatformStatus } from "@/lib/maintenance";
import type { PublicIncidents, PublicPlatformStatus } from "@/types/operations";
import type {
  PublicBillingMode,
  PublicPlan,
  ReleaseNote,
  UnsubscribeInfo,
} from "@/types/public";

/**
 * Unauthenticated calls to the API's `/public/*` endpoints, for the public
 * site. Unlike `fetchServerApi` these never carry a session token (they
 * must render the same for everyone, so they can be cached) and never
 * throw: a failed call answers `null` and the page shows a fallback, so
 * the landing page and the legal texts stay up while the API is down.
 */

const TIMEOUT_MS = 8_000;
/**
 * Cached calls (the landing page's plans, the beta switch) wait less:
 * while the API hangs, every visitor's page render was held for the full
 * timeout, and a fallback is always available for these.
 */
const CACHED_TIMEOUT_MS = 4_000;
/**
 * How long a failed cached call is remembered. Next's data cache keeps
 * only 200s, so with the API down every request repeated the doomed
 * call (and its wait); one attempt per this window is plenty.
 */
const FAILURE_MEMORY_MS = 30_000;
const recentFailures = new Map<string, number>();

function apiBaseUrl(): string | null {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  return url ? url.replace(/\/$/, "") : null;
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

  const cached = revalidate !== false;
  if (cached) {
    const failedAt = recentFailures.get(endpoint);
    if (failedAt !== undefined) {
      if (Date.now() - failedAt < FAILURE_MEMORY_MS) {
        return { ok: false, status: null };
      }
      recentFailures.delete(endpoint);
    }
  }

  const result = await fetchPublicApiUncached<T>(endpoint, base, {
    method,
    body,
    revalidate,
    forwardClientIp,
    timeoutMs: cached ? CACHED_TIMEOUT_MS : TIMEOUT_MS,
  });
  if (cached && !result.ok) recentFailures.set(endpoint, Date.now());
  return result;
}

async function fetchPublicApiUncached<T>(
  endpoint: string,
  base: string,
  {
    method,
    body,
    revalidate,
    forwardClientIp,
    timeoutMs,
  }: Required<Pick<PublicFetchOptions, "method" | "revalidate">> &
    Pick<PublicFetchOptions, "body" | "forwardClientIp"> & {
      timeoutMs: number;
    },
): Promise<PublicResult<T>> {
  try {
    const response = await fetch(`${base}${endpoint}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        // Identifies the visitor to the API's per-IP rate limiter (SPEC §9
        // H1) for the uncached calls made on their behalf, with the same
        // trusted-proxy rules as every other server call
        // (lib/server/client-ip.ts): never the raw X-Forwarded-For.
        ...(forwardClientIp ? await getInternalApiHeaders() : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
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

export interface BillingMode {
  /** Plans not enforced yet: every feature is free (until v1.0.0). */
  beta: boolean;
  /** Days of the sign-up trial (after the e-mail is verified). */
  trialDays: number;
  /** The API's answer, `null` when it couldn't be reached. */
  details: PublicBillingMode | null;
}

/**
 * The loaders below are request-scoped (React `cache`): a page, its
 * metadata and its components often need the same answer, and Next.js
 * doesn't dedupe these fetches itself because each carries a timeout
 * signal. Outside a render `cache` is a plain pass-through.
 */

/**
 * The beta switch, read from the API (`GET /public/billing`, the admin
 * panel's "Enforce plans" setting), so the public site and the API never
 * disagree. Falls back to `NEXT_PUBLIC_BILLING_ENFORCED` while the API
 * can't be reached.
 */
export const getBillingMode = cache(async (): Promise<BillingMode> => {
  const result = await fetchPublicApi<PublicBillingMode>("/public/billing", {
    revalidate: 60,
  });
  if (result.ok && typeof result.data?.beta === "boolean") {
    return {
      beta: result.data.beta,
      trialDays: result.data.trial_days,
      details: result.data,
    };
  }
  return { beta: !isBillingEnforced(), trialDays: 30, details: null };
});

/** Public plans in display order, or `null` when the API can't be reached. */
export const getPublicPlans = cache(async (): Promise<PublicPlan[] | null> => {
  const result = await fetchPublicApi<PublicPlan[]>("/public/plans", {
    revalidate: 300,
  });
  if (!result.ok || !Array.isArray(result.data)) return null;
  return [...result.data].sort((a, b) => a.sort_order - b.sort_order);
});

/** Published release notes, newest first, or `null` on failure. */
export const getPublicReleaseNotes = cache(
  async (): Promise<ReleaseNote[] | null> => {
    const result = await fetchPublicApi<ReleaseNote[]>(
      "/public/release-notes",
      {
        revalidate: 300,
      },
    );
    return result.ok && Array.isArray(result.data) ? result.data : null;
  },
);

/**
 * Maintenance mode and the sign-up switch (`GET /public/platform`), or
 * `null` when the API can't be reached or answers something malformed.
 * Kept short: the dashboard, the sign-in and the sign-up pages must
 * notice a change within seconds (the API itself caches it for 5 s and
 * enforces it whatever this says).
 */
export const getPlatformStatus = cache(
  async (): Promise<PublicPlatformStatus | null> => {
    const result = await fetchPublicApi<unknown>("/public/platform", {
      revalidate: 15,
    });
    return result.ok ? parsePlatformStatus(result.data) : null;
  },
);

/**
 * Active and recently resolved incidents for the status page, or `null`
 * when the API can't be reached (the page then just leaves them out).
 * Cached as long as the API caches them.
 */
export const getPublicIncidents = cache(
  async (): Promise<PublicIncidents | null> => {
    const result = await fetchPublicApi<PublicIncidents>("/public/incidents", {
      revalidate: 30,
    });
    if (
      !result.ok ||
      !Array.isArray(result.data?.active) ||
      !Array.isArray(result.data?.recent)
    ) {
      return null;
    }
    return result.data;
  },
);

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
