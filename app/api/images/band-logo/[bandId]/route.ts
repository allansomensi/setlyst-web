import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiPath } from "@/lib/api-endpoint";
import { fetchServerApi } from "@/lib/api-server";
import { isUuid } from "@/lib/server/api-route";
import { noImage, serveRemoteImage } from "@/lib/server/image-proxy";

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

  const session = await getServerSession(authOptions);
  if (!session?.user || session.error) return noImage(401);

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
