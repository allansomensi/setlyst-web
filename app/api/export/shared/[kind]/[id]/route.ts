import { badRequest, forwardToApi, isUuid } from "@/lib/server/api-route";
import { SHARED_FILE_KINDS, type SharedFileKind } from "@/lib/shared-file";

/**
 * `GET /api/export/shared/{setlist|gig|tour}/{id}` — a setlist, gig or
 * tour as a file someone else can import, with everything it needs (a
 * gig its setlist, a tour its gigs and their setlists, and their songs
 * and artists).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  if (!SHARED_FILE_KINDS.includes(kind as SharedFileKind) || !isUuid(id)) {
    return badRequest();
  }

  return forwardToApi(`/${kind}s/${id}/export`, {
    accept: "application/json",
    timeoutMs: 60_000,
  });
}

export const maxDuration = 60;
