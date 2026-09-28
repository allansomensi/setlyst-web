import { badRequest } from "@/lib/server/api-route";
import { forwardJsonUpload } from "@/lib/server/json-upload";
import { revalidateDashboard } from "@/lib/revalidate";
import { SHARED_FILE_KINDS, type SharedFileKind } from "@/lib/shared-file";

/**
 * `POST /api/import/shared/{setlist|gig|tour}` — imports a file exported
 * from a setlist, gig or tour, with the setlists, songs and artists it
 * brings. See `forwardJsonUpload` for the limits.
 */

export const maxDuration = 150;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!SHARED_FILE_KINDS.includes(kind as SharedFileKind)) return badRequest();

  const response = await forwardJsonUpload(request, `/${kind}s/import`);
  if (response.ok) {
    // New setlists, gigs or tours, and possibly songs, artists and tags.
    revalidateDashboard("", "layout");
  }
  return response;
}
