import "server-only";

import { headers } from "next/headers";
import {
  buildInternalHeaders,
  clientIpTrustWarning,
  resolveClientIp,
} from "@/lib/server/client-ip";

// Once per server process: a self-hosted deployment that forgot to say
// how many proxies it runs gets told at startup, not by its users.
const trustWarning = clientIpTrustWarning();
if (trustWarning) console.warn(trustWarning);

/**
 * `X-Setlyst-Internal` + `X-Setlyst-Client-IP` for a server-to-API call
 * made while handling a request (server components, server actions, route
 * handlers). See lib/server/client-ip.ts.
 *
 * Pass `source` when the incoming headers are already at hand (next-auth's
 * `authorize` receives them as a plain object); otherwise they're read
 * from the current request.
 */
export async function getInternalApiHeaders(
  source?: { get(name: string): string | null } | null,
): Promise<Record<string, string>> {
  let requestHeaders = source ?? null;
  if (!requestHeaders) {
    try {
      requestHeaders = await headers();
    } catch {
      // Outside a request scope (build time): no client to identify.
      requestHeaders = null;
    }
  }

  return buildInternalHeaders(
    process.env.INTERNAL_API_SECRET || undefined,
    requestHeaders ? resolveClientIp(requestHeaders) : null,
  );
}

/** Adapts next-auth's plain `req.headers` object to a `get()` lookup. */
export function headersFromRecord(
  record: Record<string, unknown> | undefined | null,
): { get(name: string): string | null } {
  return {
    get(name: string) {
      if (!record) return null;
      const value = record[name.toLowerCase()] ?? record[name];
      if (Array.isArray(value)) return value.length ? String(value[0]) : null;
      return typeof value === "string" ? value : null;
    },
  };
}
