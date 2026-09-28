import { GITHUB_OWNER } from "@/lib/about";
import { getGitHubAvatarUrl } from "@/lib/github";
import {
  limitImageRequests,
  noImage,
  serveRemoteImage,
} from "@/lib/server/image-proxy";
import { getSession } from "@/lib/server/session";

/**
 * The avatar is served under the same URL after it's changed on GitHub,
 * so it's kept for an hour only: a new photo shows up on its own.
 */
const AVATAR_CACHE_SECONDS = 60 * 60;

/**
 * `GET /api/images/author-avatar` — the author's GitHub avatar (the About
 * page), looked up through GitHub's API and served from this origin. Only
 * ever the one account in `GITHUB_OWNER`: not a proxy for any GitHub user.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user || session.error) return noImage(401);

  const limited = limitImageRequests(session.user.id);
  if (limited) return limited;

  const avatarUrl = await getGitHubAvatarUrl(GITHUB_OWNER);
  return serveRemoteImage(avatarUrl, { cacheSeconds: AVATAR_CACHE_SECONDS });
}
