import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpsRequest } from "node:https";
import type { IncomingMessage } from "node:http";
import { BlockList, isIP } from "node:net";

/**
 * Fetches a user-supplied image URL (avatars, band logos) on the server,
 * safely.
 *
 * The URL comes from another user, so the fetch must not become a way to
 * reach this server's own network (SSRF) or to serve something that
 * isn't an image from our origin:
 *
 *  - `https:` only, default port only, no credentials in the URL;
 *  - every address the host resolves to is checked against private,
 *    loopback, link-local, CGNAT, multicast, reserved and IPv4-mapped
 *    ranges, and the connection is made to the address that was checked
 *    (the check runs inside the socket's own DNS lookup, so a second,
 *    different answer can't slip in between check and connect);
 *  - redirects are followed by hand (at most 3), each target re-validated;
 *  - 5 s for the whole exchange, at most 1 MB (plenty for an avatar or a
 *    logo), counted while streaming;
 *  - the `Content-Type` must be an allowed raster type and the first bytes
 *    must match one (PNG, JPEG, WebP, GIF, AVIF). SVG is never served: it
 *    can carry script.
 *
 * Deliberately no Next.js imports, so the checks are unit-tested
 * (lib/__tests__/safe-image-fetch.test.ts).
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const IMAGE_FETCH_LIMITS = {
  timeoutMs: 5_000,
  maxBytes: 1024 * 1024,
  maxRedirects: 3,
} as const;

export type ImageFetchFailure =
  | "invalid_url"
  | "blocked_address"
  | "dns_failure"
  | "too_many_redirects"
  | "bad_status"
  | "not_an_image"
  | "too_large"
  | "timeout"
  | "network";

export class ImageFetchError extends Error {
  constructor(public readonly reason: ImageFetchFailure) {
    super(`Image fetch failed: ${reason}`);
    this.name = "ImageFetchError";
  }
}

// ---------------------------------------------------------------------------
// Address checks
// ---------------------------------------------------------------------------

// Separate lists: a single BlockList also matches IPv4 addresses against
// IPv6 rules through their mapped form, and the IPv6 list blocks every
// IPv4-mapped address on purpose.
const BLOCKED_V4 = new BlockList();
const BLOCKED_V6 = new BlockList();

// IPv4 (RFC 6890 special-purpose registry, plus multicast/reserved).
for (const [network, prefix] of [
  ["0.0.0.0", 8], // "this network", unspecified
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (cloud metadata lives here)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) {
  BLOCKED_V4.addSubnet(network, prefix, "ipv4");
}

// IPv6.
for (const [network, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["::", 96], // IPv4-compatible (deprecated)
  ["::ffff:0:0", 96], // IPv4-mapped
  ["64:ff9b::", 96], // NAT64 (can reach private IPv4)
  ["64:ff9b:1::", 48], // local-use NAT64
  ["100::", 64], // discard
  ["2001::", 23], // IETF protocol assignments (Teredo, ORCHID...)
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4 (embeds an IPv4 address)
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated)
  ["ff00::", 8], // multicast
] as const) {
  BLOCKED_V6.addSubnet(network, prefix, "ipv6");
}

/**
 * True for any address a user-supplied URL must not reach. Anything that
 * doesn't parse as an IP counts as blocked.
 */
export function isBlockedAddress(address: string): boolean {
  const value = address.trim().replace(/^\[|\]$/g, "");
  const family = isIP(value);
  if (family === 4) return BLOCKED_V4.check(value, "ipv4");
  if (family === 6) {
    // Zone ids ("fe80::1%eth0") are only meaningful on local links.
    if (value.includes("%")) return true;
    return BLOCKED_V6.check(value, "ipv6");
  }
  return true;
}

// ---------------------------------------------------------------------------
// URL checks
// ---------------------------------------------------------------------------

/** Parses and checks a URL's shape; throws `invalid_url` or `blocked_address`. */
export function validateImageUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImageFetchError("invalid_url");
  }
  if (url.protocol !== "https:") throw new ImageFetchError("invalid_url");
  if (url.username || url.password) throw new ImageFetchError("invalid_url");
  if (url.port && url.port !== "443") throw new ImageFetchError("invalid_url");
  if (url.pathname.toLowerCase().endsWith(".svg")) {
    throw new ImageFetchError("not_an_image");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) {
    throw new ImageFetchError("blocked_address");
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    throw new ImageFetchError("blocked_address");
  }
  if (isIP(host) && isBlockedAddress(host)) {
    throw new ImageFetchError("blocked_address");
  }
  return url;
}

// ---------------------------------------------------------------------------
// Content sniffing
// ---------------------------------------------------------------------------

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.subarray(from, to));
}

/** The image type the first bytes prove, or null (SVG, HTML, anything else). */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytes.length >= 6) {
    const gif = ascii(bytes, 0, 6);
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  // ISO-BMFF: [size][ftyp][major brand][minor][compatible brands...]
  if (bytes.length >= 16 && ascii(bytes, 4, 8) === "ftyp") {
    const boxSize = Math.min(
      bytes.length,
      ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0,
    );
    const brands = [ascii(bytes, 8, 12)];
    for (let i = 16; i + 4 <= boxSize; i += 4)
      brands.push(ascii(bytes, i, i + 4));
    if (brands.some((brand) => brand === "avif" || brand === "avis")) {
      return "image/avif";
    }
  }
  return null;
}

/** The media type of a `Content-Type` header, lowercased, without params. */
export function mediaType(header: string | undefined | null): string {
  return (header ?? "").split(";")[0].trim().toLowerCase();
}

export function isAllowedImageType(value: string): value is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

/**
 * A `lookup` for the socket that refuses hosts resolving to any blocked
 * address. Because the socket connects to what this returns, the checked
 * address is the one used.
 */
function guardedLookup(
  hostname: string,
  options: { all?: boolean } | number | undefined,
  callback: LookupCallback,
) {
  dnsLookup(hostname, { all: true, verbatim: true })
    .then((addresses) => {
      if (
        addresses.length === 0 ||
        addresses.some(({ address }) => isBlockedAddress(address))
      ) {
        const error: NodeJS.ErrnoException = new Error("blocked_address");
        error.code = "EBLOCKED";
        callback(error, "");
        return;
      }
      const wantsAll = typeof options === "object" && options?.all;
      if (wantsAll) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    })
    .catch((error: NodeJS.ErrnoException) => callback(error, ""));
}

interface FetchedImage {
  body: Uint8Array;
  contentType: AllowedImageType;
}

function get(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: "GET",
        lookup: guardedLookup as never,
        signal,
        headers: {
          Accept: ALLOWED_IMAGE_TYPES.join(", "),
          "User-Agent": "Setlyst-ImageProxy/1.0",
        },
      },
      resolve,
    );
    request.on("error", reject);
    request.end();
  });
}

async function readCapped(
  response: IncomingMessage,
  maxBytes: number,
): Promise<Uint8Array> {
  const declared = Number(response.headers["content-length"]);
  if (Number.isFinite(declared) && declared > maxBytes) {
    response.destroy();
    throw new ImageFetchError("too_large");
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of response) {
    const buffer = chunk as Buffer;
    total += buffer.byteLength;
    if (total > maxBytes) {
      response.destroy();
      throw new ImageFetchError("too_large");
    }
    chunks.push(buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

/** Fetches and verifies an image; throws `ImageFetchError`. */
export async function safeImageFetch(
  rawUrl: string,
  limits: Partial<typeof IMAGE_FETCH_LIMITS> = {},
): Promise<FetchedImage> {
  const { timeoutMs, maxBytes, maxRedirects } = {
    ...IMAGE_FETCH_LIMITS,
    ...limits,
  };
  const signal = AbortSignal.timeout(timeoutMs);

  let url = validateImageUrl(rawUrl);

  try {
    for (let redirects = 0; ; redirects++) {
      const response = await get(url, signal);
      const status = response.statusCode ?? 0;

      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        if (redirects >= maxRedirects) {
          throw new ImageFetchError("too_many_redirects");
        }
        url = validateImageUrl(new URL(response.headers.location, url).href);
        continue;
      }

      if (status !== 200) {
        response.resume();
        throw new ImageFetchError("bad_status");
      }

      const declaredType = mediaType(response.headers["content-type"]);
      if (!isAllowedImageType(declaredType)) {
        response.resume();
        throw new ImageFetchError("not_an_image");
      }

      const body = await readCapped(response, maxBytes);
      const sniffed = sniffImageType(body);
      if (!sniffed) throw new ImageFetchError("not_an_image");
      return { body, contentType: sniffed };
    }
  } catch (error) {
    if (error instanceof ImageFetchError) throw error;
    const err = error as NodeJS.ErrnoException;
    if (signal.aborted || err?.name === "AbortError") {
      throw new ImageFetchError("timeout");
    }
    if (err?.code === "EBLOCKED") throw new ImageFetchError("blocked_address");
    if (err?.code === "ENOTFOUND" || err?.code === "EAI_AGAIN") {
      throw new ImageFetchError("dns_failure");
    }
    throw new ImageFetchError("network");
  }
}
