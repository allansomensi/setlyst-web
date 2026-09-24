import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiPath } from "@/lib/api-endpoint";
import { fetchServerApi } from "@/lib/api-server";
import { isUuid } from "@/lib/server/api-route";
import {
  limitImageRequests,
  noImage,
  serveRemoteImage,
} from "@/lib/server/image-proxy";

/**
 * `GET /api/images/avatar/{userId}` — a user's avatar, fetched from the
 * URL on their profile and served from this origin. Signed-in visitors
 * only; the API decides whether the profile is visible to them.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  if (!isUuid(userId)) return noImage(400);

  const session = await getServerSession(authOptions);
  if (!session?.user || session.error) return noImage(401);

  const limited = limitImageRequests(session.user.id);
  if (limited) return limited;

  let avatarUrl: string | null = null;
  try {
    const profile = await fetchServerApi<{ avatar_url?: string | null }>(
      apiPath`/users/${userId}/profile`,
      { timeoutMs: 5_000 },
    );
    avatarUrl = profile.avatar_url ?? null;
  } catch {
    return noImage();
  }

  return serveRemoteImage(avatarUrl);
}
