import { apiPath } from "@/lib/api-endpoint";
import { fetchServerApi } from "@/lib/api-server";
import { isUuid } from "@/lib/server/api-route";
import {
  limitImageRequests,
  noImage,
  serveRemoteImage,
} from "@/lib/server/image-proxy";
import { getSession } from "@/lib/server/session";

type WithLogo = { logo_url?: string | null };

/**
 * `GET /api/images/band-logo/{bandId}` — a band's logo, served from this
 * origin. Members read it from `GET /bands/{id}`; staff (who may not be
 * members) from `GET /admin/bands/{id}`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bandId: string }> },
) {
  const { bandId } = await params;
  if (!isUuid(bandId)) return noImage(400);

  const session = await getSession();
  if (!session?.user || session.error) return noImage(401);

  const limited = limitImageRequests(session.user.id);
  if (limited) return limited;

  const isStaff =
    session.user.role === "admin" || session.user.role === "moderator";

  const endpoints = [
    apiPath`/bands/${bandId}`,
    ...(isStaff ? [apiPath`/admin/bands/${bandId}`] : []),
  ];

  for (const endpoint of endpoints) {
    try {
      const band = await fetchServerApi<WithLogo>(endpoint, {
        timeoutMs: 5_000,
      });
      return serveRemoteImage(band.logo_url ?? null);
    } catch {
      // Not a member: try the staff endpoint, if any.
    }
  }

  return noImage();
}
