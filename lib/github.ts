import { GITHUB_OWNER } from "@/lib/about";

export interface LatestCommit {
  sha: string;
  shortSha: string;
  /** First line of the commit message only. */
  message: string;
  authorName: string;
  date: string;
  url: string;
}

/** How long a fetched commit is reused before asking GitHub again. */
const REVALIDATE_SECONDS = 60 * 30;
const TIMEOUT_MS = 4000;

interface GitHubCommitResponse {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string } | null;
    committer?: { name?: string; date?: string } | null;
  };
  author?: { login?: string } | null;
}

/**
 * The latest commit on a repository's default branch, from GitHub's REST
 * API — server-side only, cached in Next's data cache so the About page
 * costs GitHub at most one request per repository per half hour
 * (comfortably inside the 60/hour unauthenticated limit). A `GITHUB_TOKEN`
 * env var, if set, is used to lift that limit.
 *
 * Never throws: GitHub being slow, rate-limiting, or unreachable (offline,
 * a self-hosted instance with no egress) just means the page shows the
 * repository without its last commit.
 */
export async function getLatestCommit(
  repo: string,
): Promise<LatestCommit | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      // GitHub rejects API requests without a User-Agent.
      "User-Agent": "setlyst-web",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${encodeURIComponent(repo)}/commits?per_page=1`,
      {
        headers,
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!response.ok) return null;

    const [commit] = (await response.json()) as GitHubCommitResponse[];
    if (!commit) return null;

    const author = commit.commit.author ?? commit.commit.committer;
    return {
      sha: commit.sha,
      shortSha: commit.sha.slice(0, 7),
      message: commit.commit.message.split("\n")[0].trim(),
      authorName: author?.name ?? commit.author?.login ?? "",
      date: author?.date ?? "",
      url: commit.html_url,
    };
  } catch {
    return null;
  }
}

/**
 * Gitmoji shortcodes (`:sparkles:`) as the emoji they stand for, so commit
 * subjects read the way they do on GitHub. Unknown codes are left as-is.
 */
const GITMOJI: Record<string, string> = {
  art: "🎨",
  zap: "⚡️",
  fire: "🔥",
  bug: "🐛",
  ambulance: "🚑️",
  sparkles: "✨",
  memo: "📝",
  rocket: "🚀",
  lipstick: "💄",
  tada: "🎉",
  white_check_mark: "✅",
  lock: "🔒️",
  closed_lock_with_key: "🔐",
  bookmark: "🔖",
  rotating_light: "🚨",
  construction: "🚧",
  green_heart: "💚",
  arrow_down: "⬇️",
  arrow_up: "⬆️",
  pushpin: "📌",
  construction_worker: "👷",
  chart_with_upwards_trend: "📈",
  recycle: "♻️",
  heavy_plus_sign: "➕",
  heavy_minus_sign: "➖",
  wrench: "🔧",
  hammer: "🔨",
  globe_with_meridians: "🌐",
  pencil2: "✏️",
  poop: "💩",
  rewind: "⏪️",
  twisted_rightwards_arrows: "🔀",
  package: "📦️",
  alien: "👽️",
  truck: "🚚",
  page_facing_up: "📄",
  boom: "💥",
  bento: "🍱",
  wheelchair: "♿️",
  bulb: "💡",
  beers: "🍻",
  speech_balloon: "💬",
  card_file_box: "🗃️",
  loud_sound: "🔊",
  mute: "🔇",
  busts_in_silhouette: "👥",
  children_crossing: "🚸",
  building_construction: "🏗️",
  iphone: "📱",
  clown_face: "🤡",
  egg: "🥚",
  see_no_evil: "🙈",
  camera_flash: "📸",
  alembic: "⚗️",
  mag: "🔍️",
  label: "🏷️",
  seedling: "🌱",
  triangular_flag_on_post: "🚩",
  goal_net: "🥅",
  dizzy: "💫",
  wastebasket: "🗑️",
  passport_control: "🛂",
  adhesive_bandage: "🩹",
  monocle_face: "🧐",
  coffin: "⚰️",
  test_tube: "🧪",
  necktie: "👔",
  stethoscope: "🩺",
  bricks: "🧱",
  technologist: "🧑‍💻",
  money_with_wings: "💸",
  thread: "🧵",
  safety_vest: "🦺",
  airplane: "✈️",
};

export function emojifyGitmoji(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/g, (match, code: string) =>
    Object.prototype.hasOwnProperty.call(GITMOJI, code) ? GITMOJI[code] : match,
  );
}
