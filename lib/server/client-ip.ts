import { isIP } from "node:net";

/**
 * Who the visitor is, as far as the API is concerned.
 *
 * The API rate-limits and audits by client address. When the Next.js
 * server calls it on someone's behalf, the socket peer the API sees is
 * this server, so every visitor would share one bucket. The real address
 * travels in `X-Setlyst-Client-IP`, and the API only believes it when the
 * request also carries the shared `INTERNAL_API_SECRET`
 * (`setlyst-api/src/middlewares/client_ip.rs`).
 *
 * The raw `X-Forwarded-For` the browser sent is never forwarded: anything
 * left of the hops our own proxies appended was written by the client.
 * Which headers are believed depends on the deployment
 * (`VERCEL`, `TRUSTED_PROXY_HOPS`, `TRUST_X_REAL_IP`); see resolveClientIp.
 *
 * Pure (no Next.js imports) so it can be unit-tested; see
 * lib/server/internal-api.ts for the request-bound helpers.
 */

export const INTERNAL_SECRET_HEADER = "X-Setlyst-Internal";
export const INTERNAL_CLIENT_IP_HEADER = "X-Setlyst-Client-IP";

interface HeaderSource {
  get(name: string): string | null;
}

/** Strips brackets, quotes and a port, then checks the result is an IP. */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim().replace(/^"|"$/g, "");
  if (!value) return null;

  if (value.startsWith("[")) {
    // "[2001:db8::1]:443"
    const end = value.indexOf("]");
    if (end === -1) return null;
    value = value.slice(1, end);
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(value)) {
    // "203.0.113.7:51234"
    value = value.slice(0, value.lastIndexOf(":"));
  }

  return isIP(value) ? value : null;
}

/** Deployment facts that decide which forwarding headers can be believed. */
export interface ClientIpTrust {
  /** Running on Vercel, whose edge overwrites `x-vercel-forwarded-for` and `x-real-ip`. */
  vercel: boolean;
  /**
   * How many reverse proxies we control sit in front of this server, each
   * appending the address it saw to `X-Forwarded-For`. The visitor is the
   * entry this many positions from the right. 0 (the default) disables the
   * header: with no proxy of ours in front, Next.js keeps whatever
   * `X-Forwarded-For` the client sent, so even the rightmost entry would
   * be attacker-chosen.
   */
  trustedProxyHops: number;
  /** A proxy we control overwrites `x-real-ip` (never forwards the client's). */
  trustXRealIp: boolean;
}

const MAX_TRUSTED_PROXY_HOPS = 10;

/** Reads the trust settings from the environment (see .env.example). */
export function clientIpTrustFromEnv(
  env: Record<string, string | undefined> = process.env,
): ClientIpTrust {
  const rawHops = env.TRUSTED_PROXY_HOPS?.trim();
  let hops = 0;
  if (rawHops !== undefined && rawHops !== "") {
    const parsed = /^\d+$/.test(rawHops) ? Number(rawHops) : NaN;
    hops = Number.isFinite(parsed)
      ? Math.min(parsed, MAX_TRUSTED_PROXY_HOPS)
      : 0;
  }
  return {
    vercel: Boolean(env.VERCEL),
    trustedProxyHops: hops,
    trustXRealIp: env.TRUST_X_REAL_IP?.trim().toLowerCase() === "true",
  };
}

/**
 * A warning for the server log when the internal secret is configured but
 * nothing says how to find the visitor's address (self-hosted, with
 * neither `TRUSTED_PROXY_HOPS` nor `TRUST_X_REAL_IP`): every visitor then
 * shares this server's rate-limit bucket at the API. Null when all is
 * well.
 */
export function clientIpTrustWarning(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!env.INTERNAL_API_SECRET || env.VERCEL) return null;
  if (env.TRUSTED_PROXY_HOPS?.trim()) return null;
  if (env.TRUST_X_REAL_IP?.trim().toLowerCase() === "true") return null;
  return (
    "[client-ip] INTERNAL_API_SECRET is set but neither TRUSTED_PROXY_HOPS " +
    "nor TRUST_X_REAL_IP is: visitor addresses are not forwarded to the " +
    "API (all visitors share this server's rate limits). Set " +
    "TRUSTED_PROXY_HOPS to the number of reverse proxies in front of " +
    "Next.js."
  );
}

/**
 * The visitor's address from the incoming request headers, or null when
 * nothing trustworthy says who they are (the API then uses the socket
 * peer, i.e. this server, which is safe: never a spoofed address).
 *
 * Everything left of the entries our own proxies appended to
 * `X-Forwarded-For` was written by the client, so the leftmost entry is
 * never used. On Vercel the platform overwrites `x-vercel-forwarded-for`
 * and `x-real-ip`; elsewhere `x-real-ip` is only believed when
 * `TRUST_X_REAL_IP=true` says our proxy sets it.
 */
export function resolveClientIp(
  headers: HeaderSource,
  trust: ClientIpTrust = clientIpTrustFromEnv(),
): string | null {
  if (trust.vercel) {
    const vercelIp =
      normalizeIp(headers.get("x-vercel-forwarded-for")?.split(",")[0]) ??
      normalizeIp(headers.get("x-real-ip"));
    if (vercelIp) return vercelIp;
    return null;
  }

  if (trust.trustXRealIp) {
    const realIp = normalizeIp(headers.get("x-real-ip"));
    if (realIp) return realIp;
  }

  if (trust.trustedProxyHops > 0) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const hops = forwarded
        .split(",")
        .map((hop) => hop.trim())
        .filter(Boolean);
      const index = hops.length - trust.trustedProxyHops;
      if (index >= 0) return normalizeIp(hops[index]);
    }
  }

  return null;
}

/**
 * The headers identifying this server (and the visitor) to the API.
 * Nothing at all when the secret isn't configured: the API then falls
 * back to the socket peer, exactly as before.
 */
export function buildInternalHeaders(
  secret: string | undefined,
  clientIp: string | null,
): Record<string, string> {
  if (!secret) return {};
  const result: Record<string, string> = { [INTERNAL_SECRET_HEADER]: secret };
  if (clientIp) result[INTERNAL_CLIENT_IP_HEADER] = clientIp;
  return result;
}
