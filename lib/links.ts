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
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@setlyst.app";

/** The public system status page (outside the locale segment). */
export const STATUS_PATH = "/status";

export const LEGAL_DOCUMENTS = ["terms", "privacy", "security"] as const;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

export function isLegalDocument(value: unknown): value is LegalDocument {
  return (
    typeof value === "string" &&
    (LEGAL_DOCUMENTS as readonly string[]).includes(value)
  );
}

/**
 * A post-login destination that can only ever point inside this app
 * (never `//evil.example` or `https://…`), so `callbackUrl` can't be used
 * as an open redirect.
 */
export function safeCallbackPath(
  value: string | null | undefined,
): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  return value;
}
