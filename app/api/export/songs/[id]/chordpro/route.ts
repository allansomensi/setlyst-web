import { badRequest, forwardToApi, isUuid } from "@/lib/server/api-route";

/** `GET /api/export/songs/{id}/chordpro` — one song as a `.cho` file. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return badRequest();

  return forwardToApi(`/songs/${id}/export/chordpro`, { timeoutMs: 30_000 });
}
