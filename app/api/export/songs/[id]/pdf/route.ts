import type { NextRequest } from "next/server";
import { SONG_PDF_QUERY_KEYS } from "@/lib/pdf-export-options";
import {
  badRequest,
  forwardToApi,
  isUuid,
  pickQuery,
} from "@/lib/server/api-route";

/**
 * `GET /api/export/songs/{id}/pdf?<options>` — a single-song sheet (SPEC
 * §8.2). Options: see `SONG_PDF_QUERY_KEYS`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return badRequest();

  const query = pickQuery(request.nextUrl.searchParams, SONG_PDF_QUERY_KEYS);
  return forwardToApi(`/songs/${id}/export/pdf?${query}`, {
    accept: "application/pdf",
    timeoutMs: 60_000,
  });
}
