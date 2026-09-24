import type { NextRequest } from "next/server";
import { apiPath } from "@/lib/api-endpoint";
import { PUBLIC_SETLIST_PDF_QUERY_KEYS } from "@/lib/pdf-export-options";
import { badRequest, forwardToApi, pickQuery } from "@/lib/server/api-route";

/** Share tokens are URL-safe random strings. */
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * `GET /api/export/public/setlists/{token}/pdf?<options>` — the PDF of a
 * shared setlist (`/s/{token}`), for anyone holding the link. Proxied so
 * the browser only ever talks to this origin (the CSP's `connect-src`
 * doesn't list the API) and the API sees the visitor's address.
 *
 * Never with lyrics or chords: the lyrics options are dropped and
 * `include_lyrics=false` is always sent (the API enforces it as well).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return badRequest();

  const query = pickQuery(
    request.nextUrl.searchParams,
    PUBLIC_SETLIST_PDF_QUERY_KEYS,
  );
  query.set("include_lyrics", "false");
  return forwardToApi(
    `${apiPath`/public/setlists/${token}/export/pdf`}?${query}`,
    { accept: "application/pdf", timeoutMs: 60_000, anonymous: true },
  );
}
