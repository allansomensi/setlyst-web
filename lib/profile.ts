/**
 * Public-profile rules, mirrored from the API (`models/user.rs`,
 * `validations/image_url.rs`) so the form can guide the person before
 * saving. The API remains the authority.
 */

export const BIO_MAX = 280;
export const LOCATION_MAX = 80;
export const INSTRUMENTS_MAX = 8;
export const INSTRUMENT_MAX = 30;
export const AVATAR_URL_MAX = 500;

/**
 * Trimmed, inner whitespace collapsed, empty entries dropped and
 * de-duplicated case-insensitively (first spelling wins), like the API.
 */
export function normalizeInstruments(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value.trim().replace(/\s+/g, " ");
    if (!clean) continue;
    const key = clean.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function isIpLiteral(host: string): boolean {
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host.startsWith("[") ||
    host.includes(":")
  );
}

/**
 * Whether `value` looks like an avatar URL the API will accept: `https`,
 * at most 500 characters, no credentials, a public host name (no IP
 * literal, localhost, `.local` or `.internal`) and not an SVG. The API
 * also checks a blocklist and moderates the image.
 */
export function isAcceptableAvatarUrl(value: string): boolean {
  if (!value || value.length > AVATAR_URL_MAX) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (!host || !host.includes(".") || isIpLiteral(host)) return false;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  if (url.pathname.toLowerCase().endsWith(".svg")) return false;
  return true;
}
