import "server-only";

import { headers } from "next/headers";

/**
 * The CSP nonce of the current request (set by proxy.ts), for the inline
 * scripts a server component renders itself (next-themes' theme script,
 * JSON-LD). Next.js adds it to its own scripts on its own. Reading it
 * makes the page dynamic, which a per-request nonce requires anyway.
 */
export async function getNonce(): Promise<string | undefined> {
  try {
    return (await headers()).get("x-nonce") ?? undefined;
  } catch {
    return undefined;
  }
}
