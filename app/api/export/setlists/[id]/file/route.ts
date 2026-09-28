import { badRequest, forwardToApi, isUuid } from "@/lib/server/api-route";

/**
 * `GET /api/export/setlists/{id}/file` — the setlist as a file someone
 * else can import (its songs and artists included).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return badRequest();

  return forwardToApi(`/setlists/${id}/export`, {
    accept: "application/json",
    timeoutMs: 60_000,
  });
}

export const maxDuration = 60;
