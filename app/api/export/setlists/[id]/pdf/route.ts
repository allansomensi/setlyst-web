import type { NextRequest } from "next/server";
import { SETLIST_PDF_QUERY_KEYS } from "@/lib/pdf-export-options";
import {
  badRequest,
  forwardToApi,
  isUuid,
  pickQuery,
} from "@/lib/server/api-route";

/**
 * `GET /api/export/setlists/{id}/pdf?<options>` — the setlist PDF, as
 * the signed-in person. Options: see `SETLIST_PDF_QUERY_KEYS`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return badRequest();

  const query = pickQuery(request.nextUrl.searchParams, SETLIST_PDF_QUERY_KEYS);
  return forwardToApi(`/setlists/${id}/export/pdf?${query}`, {
    accept: "application/pdf",
    timeoutMs: 60_000,
  });
}
