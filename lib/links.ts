/**
 * External and cross-cutting links, in one place so a URL change is a
 * one-line edit.
 */

import { GITHUB_OWNER } from "@/lib/about";

/** The user documentation (GitHub wiki). */
export const WIKI_URL =
  process.env.NEXT_PUBLIC_WIKI_URL ??
  `https://github.com/${GITHUB_OWNER}/setlyst-web/wiki`;

/** Where people report bugs or ask for features. */
export const ISSUES_URL = `https://github.com/${GITHUB_OWNER}/setlyst-web/issues`;

/** Contact for account help (locked out, lost password, data requests). */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contato@setlyst.com.br";

/** The public system status page (outside the locale segment). */
export const STATUS_PATH = "/status";

/**
 * The public legal documents, in reading order (see lib/legal-content.ts
 * for the texts and lib/legal.ts for the version in force).
 */
export const LEGAL_DOCUMENTS = [
  "terms",
  "privacy",
  "cookies",
  "subscription",
  "guidelines",
  "copyright",
  "security",
] as const;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

export function isLegalDocument(value: unknown): value is LegalDocument {
  return (
    typeof value === "string" &&
    (LEGAL_DOCUMENTS as readonly string[]).includes(value)
  );
}

/** C0 and C1 control characters (and DEL). */
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * A post-login destination that can only ever point inside this app
 * (never `//evil.example` or `https://…`), so `callbackUrl` can't be used
 * as an open redirect.
 *
 * Browsers strip tabs and newlines from URLs and some servers decode
 * `%2F`/`%5C` before routing, so `/%09/evil.example` or `/%2F/evil.example`
 * could still turn into a protocol-relative URL: control characters (raw
 * or percent-encoded) and encoded slashes or backslashes are refused.
 * So is `//` anywhere in the path: `/en//evil.example` loses its locale
 * prefix before navigating and would become `//evil.example`.
 */
export function safeCallbackPath(
  value: string | null | undefined,
): string | null {
  if (!value || value.length > 2048) return null;
  if (!value.startsWith("/") || hasEmptySegment(value)) return null;
  if (value.includes("\\") || CONTROL_CHARS.test(value)) return null;
  if (/%(2f|5c)/i.test(value)) return null;

  // Decode repeatedly (double encoding) and check what a lenient
  // consumer would see.
  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      // Malformed as sent: refuse. Malformed only after a first decode:
      // what remains is a literal "%", nothing more to decode.
      if (i === 0) return null;
      break;
    }
    if (next === decoded) break;
    decoded = next;
  }
  if (
    CONTROL_CHARS.test(decoded) ||
    decoded.includes("\\") ||
    hasEmptySegment(decoded) ||
    /%(2f|5c)/i.test(decoded)
  ) {
    return null;
  }
  return value;
}

/**
 * Whether the path part (before `?` or `#`) contains `//`. A locale
 * prefix is stripped before navigating (`/en//evil.example` →
 * `//evil.example`), so an empty segment anywhere can turn into a
 * protocol-relative URL; no page of this app has one.
 */
function hasEmptySegment(path: string): boolean {
  const [pathname] = path.split(/[?#]/, 1);
  return pathname.includes("//");
}

/**
 * next-auth's `redirect` callback: where the browser may go after signing
 * in or out. Only this app's own origin, and only paths that pass
 * `safeCallbackPath` (no `//`, backslashes, control characters or encoded
 * slashes). Anything else lands on the site root.
 */
export function safeAuthRedirect(url: string, baseUrl: string): string {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return "/";
  }
  const root = base.origin + base.pathname.replace(/\/$/, "");

  if (url.startsWith("/")) {
    return safeCallbackPath(url) ? `${root}${url}` : root;
  }

  try {
    const target = new URL(url);
    if (target.origin !== base.origin) return root;
    const path = `${target.pathname}${target.search}${target.hash}`;
    return safeCallbackPath(path) ? `${base.origin}${path}` : root;
  } catch {
    return root;
  }
}
