/**
 * Setlyst service worker.
 *
 * Goal: let a page you've already opened at least once while online keep
 * working with no signal — this matters most for the Live Mode screen,
 * which musicians open at a venue that may have bad or no connectivity.
 *
 * Strategy:
 *  - Full page navigations (a real browser load of a URL, not a client-side
 *    transition): network-first. On success the response is cached; on
 *    failure (offline) the last cached copy for that exact URL is served.
 *    If that exact URL was never cached — e.g. the app relaunches offline
 *    on its start_url, or a deep link nobody has opened yet this session —
 *    it redirects to whatever page shell IS cached (the setlists list, the
 *    dashboard, the songs list, in that order) instead of dead-ending, so
 *    synced data is always reachable and not just from the one URL that
 *    happened to be open when the app was last closed. Only a genuinely
 *    empty cache falls through to the generic offline page.
 *  - Next.js build assets under /_next/static/: cache-first. Their
 *    filenames are content-hashed, so a cached copy is always valid.
 *  - Any other same-origin GET (images, fonts, etc.): stale-while-revalidate.
 *
 * Deliberately NOT cached: non-GET requests (mutations), cross-origin
 * requests (the API server), the app's own /api/* routes, responses marked
 * `Cache-Control: no-store` or `private` (other than page navigations,
 * which Next.js always marks that way), and the account and staff pages
 * listed in PRIVATE_PATHS, which only ever come from the network. Losing
 * network never silently serves a stale mutation result or a stale API
 * response; only already-rendered pages and static assets are replayed
 * offline.
 *
 * On sign-out the app posts `{ type: "CLEAR" }` (lib/client-logout.ts) and
 * every cache is dropped, so the next person using the device can't read
 * the previous one's pages.
 */

// v8: stored pages carry the time they were stored and expire after a
// week (PAGE_MAX_AGE_MS); pages rendered while impersonating or answered
// with the login page are never stored. Pages from v7 had no timestamp:
// dropping them on activate removes them from disk, not only from use.
//
// v7: offline.html's script moved to /offline.js (strict CSP), precached
// next to it.
//
// v6: drops every page cached by earlier versions, which could include the
// staff console and account settings (now never cached, see PRIVATE_PATHS).
//
// v5 was bumped so every client picks up this fix cleanly: earlier versions could
// cache a page that was silently showing the "couldn't load, retrying"
// notice instead of real content (see LOAD_ERROR_MARKER below) — offline,
// that retry can never succeed, so anyone who already has one of those
// stuck in their cache needs it evicted, not just future ones avoided. Old
// caches are deleted on activate (see the "activate" handler below) rather
// than reused.
const CACHE_VERSION = "setlyst-v8";
const CACHE_PREFIX = "setlyst";
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";
// Its script (a separate file: the CSP allows no inline scripts). Kept in
// the runtime cache, which is where staleWhileRevalidate looks for it.
const OFFLINE_SCRIPT_URL = "/offline.js";

// Matches the marker on app/[locale]/dashboard/error.tsx's error boundary.
// React can stream an HTTP 200 for a document whose nested data fetch threw
// after the outer shell already flushed its headers (a backend timeout or
// rate limit mid-precache, say), so `response.ok` alone can't tell a real
// page from this fallback rendered *as* a 200. Caching that page anyway
// would mean an offline visitor lands on a dead "something went wrong"
// screen forever instead of either real content or the landing-page
// fallback below — worse than not caching it at all.
const ERROR_BOUNDARY_MARKER = "data-error-boundary";

// Matches the marker on components/load-error-notice.tsx. That component
// renders a normal HTTP 200 page, so `response.ok` and the error-boundary
// check above both let it through — but it means the underlying data fetch
// failed and the list is showing a "retrying" notice instead of real
// content. Caching that snapshot would mean an offline visitor lands on a
// notice that promises an automatic retry which, with no connection, can
// never happen — worse than falling back to the cached-landing-page logic
// below, which at least finds them a page with real data on it.
const LOAD_ERROR_MARKER = "data-load-error-notice";

/**
 * Pages that are never stored, not even for offline use: account settings,
 * profiles and the staff console hold personal data of the signed-in
 * person or of other users, and none of them is needed at a venue.
 * Matched with or without the locale prefix.
 */
const PRIVATE_PATHS = [
  "/dashboard/users",
  "/dashboard/admin",
  "/dashboard/settings",
  "/dashboard/profile",
  // Band invite links: the code in the URL is a credential.
  "/dashboard/invite",
];

/**
 * How long a stored page may be replayed offline. Past this, a page is as
 * good as gone: a device left behind (a venue tablet, a band laptop) stops
 * serving the last person's setlists and bands after a week, even if
 * nobody ever opens the app on it again. Pages stored by earlier versions
 * carry no timestamp and count as expired.
 */
const PAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHED_AT_HEADER = "x-setlyst-cached-at";

/**
 * Set by proxy.ts on every page rendered while staff view the app as
 * someone else: such a page is never stored.
 */
const IMPERSONATION_HEADER = "x-setlyst-impersonating";

/**
 * A page the offline sync asks to precache is skipped while its stored
 * copy is younger than this. Offline, pages take their data from the
 * IndexedDB mirror (lib/offline/*), so the stored HTML is only a shell;
 * re-rendering every song and setlist page on every sync (each render
 * several API calls) was the heaviest load the app put on its server.
 * Well under PAGE_MAX_AGE_MS, so a synced page never expires, and a page
 * actually visited is refreshed by networkFirst() anyway.
 */
const PRECACHE_REFRESH_MS = 24 * 60 * 60 * 1000;

/** Whether a stored page was stored less than PRECACHE_REFRESH_MS ago. */
function isRecentlyStored(response, now = Date.now()) {
  if (!response) return false;
  const cachedAt = Number(response.headers.get(CACHED_AT_HEADER));
  return (
    Number.isFinite(cachedAt) &&
    cachedAt > 0 &&
    cachedAt <= now + 60_000 &&
    now - cachedAt < PRECACHE_REFRESH_MS
  );
}

/** Whether a stored page is still young enough to replay (see PAGE_MAX_AGE_MS). */
function isFreshPage(response, now = Date.now()) {
  if (!response) return false;
  const cachedAt = Number(response.headers.get(CACHED_AT_HEADER));
  return (
    Number.isFinite(cachedAt) &&
    cachedAt > 0 &&
    cachedAt <= now + 60_000 &&
    now - cachedAt <= PAGE_MAX_AGE_MS
  );
}

/**
 * A page request that the server answered by redirecting to the login
 * page (the session is gone): storing that answer under the requested
 * dashboard URL would replay a login screen for it offline, or worse,
 * the wrong page.
 */
function isLoginRedirect(response) {
  if (!response || !response.redirected || !response.url) return false;
  try {
    const { pathname } = new URL(response.url);
    const segments = pathname.split("/").filter(Boolean);
    const rest = hasLocalePrefix(pathname) ? segments.slice(1) : segments;
    return rest[0] === "login";
  } catch {
    return false;
  }
}

/** A redirected response whose final URL is one of PRIVATE_PATHS. */
function landsOnPrivatePath(response) {
  if (!response || !response.redirected || !response.url) return false;
  try {
    return isPrivatePath(new URL(response.url).pathname);
  } catch {
    return true;
  }
}

function isPrivatePath(pathname) {
  const segments = pathname.split("/");
  const withoutLocale = hasLocalePrefix(pathname)
    ? `/${segments.slice(2).join("/")}`
    : pathname;
  return PRIVATE_PATHS.some(
    (prefix) =>
      withoutLocale === prefix || withoutLocale.startsWith(`${prefix}/`),
  );
}

/** `Cache-Control: no-store` or `private` on a non-page response. */
function forbidsCaching(response) {
  const cacheControl = (
    response.headers.get("cache-control") || ""
  ).toLowerCase();
  return /\b(no-store|private)\b/.test(cacheControl);
}

/** Deletes every cache this worker (any version of it) ever created. */
async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => caches.delete(key)),
  );
}

/**
 * Whether a response is safe to cache as a page/asset. Non-HTML responses
 * (content-hashed static assets, JSON, etc.) are trusted on status alone;
 * HTML responses are scanned for the error-boundary and load-error markers
 * first.
 */
async function isUsableForCache(response) {
  if (!response || !response.ok) return false;
  if (response.headers.get(IMPERSONATION_HEADER)) return false;
  if (isLoginRedirect(response)) return false;
  // A followed redirect that landed on a page that is never stored
  // (settings, the staff console...) must not be stored under the URL
  // that was asked for either: the precache fetches follow redirects.
  if (landsOnPrivatePath(response)) return false;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return true;

  try {
    const text = await response.clone().text();
    return (
      !text.includes(ERROR_BOUNDARY_MARKER) && !text.includes(LOAD_ERROR_MARKER)
    );
  } catch {
    // Couldn't read the body to check — don't let that block caching an
    // otherwise-ok response.
    return true;
  }
}

/**
 * Pulls every same-origin build asset a page references out of its HTML.
 *
 * This is the difference between a page that *looks* saved and one that
 * actually works with no signal. Caching a page's HTML alone gets its
 * server-rendered markup on screen — the lyrics really do paint — and then
 * React tries to hydrate, asks for that route's own JS chunk, and finds
 * nothing: the request fails, hydration throws, and the error boundary
 * ("something went wrong") drops on top of the content the person can
 * still see underneath. That is precisely what happened to anyone who
 * pressed "download for offline use" and then opened Live Mode for the
 * first time without a connection: every route has chunks unique to it, and
 * a route nobody had visited online had never had them fetched.
 *
 * Deliberately a regex over the markup rather than real parsing: a service
 * worker has no DOMParser, the paths are content-hashed and quoted in
 * predictable ways (`src`, `href`, preloads, and the inline flight data),
 * and over-matching is harmless — a URL that isn't a real asset simply
 * fails to fetch and is skipped.
 */
function extractStaticAssetPaths(html) {
  const matches = html.match(/\/_next\/static\/[^"'\\\s)>]+/g) || [];
  return [...new Set(matches)];
}

/**
 * Same idea one level deeper: a stylesheet references its fonts with
 * `url(/_next/static/media/...)`. Without these a page cached "completely"
 * still falls back to system fonts the moment it's opened offline, which
 * looks broken even though it technically works.
 */
function extractCssAssetPaths(css) {
  const matches = css.match(/\/_next\/static\/media\/[^"'\\\s)]+/g) || [];
  return [...new Set(matches)];
}

/**
 * Fetches and caches every build asset `html` depends on, following one
 * level into stylesheets for their fonts. Already-cached assets are
 * skipped, so re-running a full download stays cheap — the vast majority
 * of chunks are shared between routes.
 */
async function precachePageAssets(html) {
  const cache = await caches.open(STATIC_CACHE);
  const assetPaths = extractStaticAssetPaths(html);

  await mapWithConcurrency(assetPaths, 6, async (path) => {
    try {
      if (await cache.match(path)) return;

      const response = await fetch(path, { credentials: "same-origin" });
      if (!response.ok) return;

      const isStylesheet =
        path.endsWith(".css") ||
        (response.headers.get("content-type") || "").includes("text/css");

      if (isStylesheet) {
        const css = await response.clone().text();
        const fontPaths = extractCssAssetPaths(css);
        await mapWithConcurrency(fontPaths, 4, async (fontPath) => {
          try {
            if (await cache.match(fontPath)) return;
            const font = await fetch(fontPath, { credentials: "same-origin" });
            if (font.ok) await cache.put(fontPath, font);
          } catch {
            // A missing font degrades typography, nothing more.
          }
        });
      }

      await cache.put(path, response);
    } catch {
      // Best-effort per asset: one failure shouldn't abandon the rest.
    }
  });
}

/**
 * Runs `fn` over `items` with at most `limit` calls in flight at once.
 * Precaching every setlist/song page shell in one uncapped burst (a full
 * "Download for offline use") can be dozens of simultaneous server
 * renders, each hitting the backend API — easily enough to trip its rate
 * limiting and turn a page that would otherwise cache fine into an error
 * response. A modest cap keeps sync reliable without making it noticeably
 * slower.
 */
async function mapWithConcurrency(items, limit, fn) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      await fn(items[current], current);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(PAGES_CACHE).then((cache) => cache.addAll([OFFLINE_URL])),
      caches
        .open(RUNTIME_CACHE)
        .then((cache) => cache.addAll([OFFLINE_SCRIPT_URL])),
    ]).catch(() => {
      // Precaching the offline fallback is best-effort; a fetch-time
      // failure here must never block the service worker from installing.
    }),
  );
  // Deliberately NOT calling self.skipWaiting() here. Taking over
  // immediately (and the "activate" handler below evicting every older
  // cache right after) used to mean: the instant a new version deployed,
  // any tab still open on the OLD build could have its in-flight or next
  // lazy-loaded JS chunk request intercepted by the NEW worker, which has
  // no record of that old, content-hashed filename — and the server no
  // longer serves it either, once the next deploy has run. That's a hard
  // crash (a chunk load error) for someone who did nothing wrong, and it
  // could land mid Live Mode performance. Instead, a new worker sits in
  // "waiting" until a client explicitly tells it to take over (see the
  // SKIP_WAITING message below) — see components/service-worker-register.tsx
  // for the "update available" prompt that sends it.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// Lets the app proactively cache page shells it knows will matter offline
// (a setlist's detail/Live Mode pages, a song's Live Mode page) as soon as
// that data is synced — not only once someone has actually visited that
// exact URL. See lib/offline/precache.ts and lib/offline/sync.ts for the
// client side of this: every full sync posts the full list of URLs that
// now have fresh data behind them.
self.addEventListener("message", (event) => {
  if (!event.data) return;

  // Sent by components/service-worker-register.tsx once the person has
  // acknowledged the "update available" prompt — never automatically, so
  // an update can't pull a page out from under someone mid-use.
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  // Sent on sign-out (lib/client-logout.ts) and when a different account
  // signs in on this device (lib/offline/owner.ts). The offline fallback
  // page holds no personal data and is put back right away.
  if (event.data.type === "CLEAR") {
    event.waitUntil(
      (async () => {
        try {
          await clearAllCaches();
          await (await caches.open(PAGES_CACHE)).add(OFFLINE_URL);
          await (await caches.open(RUNTIME_CACHE)).add(OFFLINE_SCRIPT_URL);
        } catch {
          // Best-effort: the page also clears Cache Storage itself.
        }
      })(),
    );
    return;
  }

  if (event.data.type !== "PRECACHE_URLS") return;
  const urls = (Array.isArray(event.data.urls) ? event.data.urls : []).filter(
    (url) => {
      try {
        const parsed = new URL(url, self.location.origin);
        return (
          parsed.origin === self.location.origin &&
          !isPrivatePath(parsed.pathname)
        );
      } catch {
        return false;
      }
    },
  );
  if (urls.length === 0) return;

  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      // Two at a time: these are full server renders, and a sync can ask
      // for hundreds of them.
      await mapWithConcurrency(urls, 2, async (url) => {
        try {
          if (isRecentlyStored(await cache.match(url))) return;
          const response = await fetch(url, { credentials: "same-origin" });
          if (await isUsableForCache(response)) {
            const html = await response.clone().text();
            // Same rebuild-before-storing treatment a real navigation gets
            // (see cachePage): a redirected response can't go into the
            // cache as-is, and silently failing here would leave a setlist
            // looking "saved for offline use" while its page was never
            // actually stored.
            await cachePage(cache, new Request(url), response);
            // The page's own JS/CSS, without which it can be served offline
            // and still fail the moment React tries to hydrate it.
            await precachePageAssets(html);
          }
        } catch {
          // Best-effort: a page that fails to precache here just falls
          // back to whatever networkFirst() does the next time it's
          // actually opened (a fresh fetch if online, the cached-landing-
          // page fallback or /offline.html if not).
        }
      });
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch the app's own API routes — /api/auth/* in particular.
  // NextAuth's session endpoint is a plain same-origin GET, so the generic
  // stale-while-revalidate branch below would happily serve a *cached*
  // session: the app could read a signed-out person as signed in, or keep
  // handing an old token to the API long after it rotated. Auth state must
  // always come from the network or not at all.
  if (url.pathname.startsWith("/api/")) return;

  // React Server Component payload requests (Next.js' client-side
  // transitions) are passed straight through to the network, never cached
  // and never served from cache. Two reasons:
  //  - A payload is only valid for the exact build that produced it, and
  //    the app's navigation code doesn't rely on these offline anyway:
  //    while offline it deliberately performs real browser navigations
  //    instead (see lib/offline/navigation.ts), which land on the
  //    `navigate` branch below and get a properly cached page.
  //  - Letting one fail fast offline is what makes Next.js fall back to a
  //    real navigation on its own, as a second line of defense for any
  //    navigation that didn't go through the app's own helpers.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      isPrivatePath(url.pathname)
        ? networkOnly(request)
        : networkFirst(request, event),
    );
    return;
  }

  // Data behind the private pages is never kept either.
  if (isPrivatePath(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

// Minimal, dependency-free translations for the last-resort inline fallback
// below — used only if the /offline.html precache is itself unavailable
// (e.g. Cache Storage was cleared or quota-evicted mid-session). Keep in
// sync with the dictionary in public/offline.html.
const FALLBACK_STRINGS = {
  en: "You're offline and this page hasn't been saved yet.",
  "pt-BR": "Você está offline e esta página ainda não foi salva.",
  es: "Estás sin conexión y esta página todavía no se guardó.",
};
const FALLBACK_DEFAULT_LOCALE = "en";

function resolveLocaleFromPathname(pathname) {
  const segment = (pathname.split("/")[1] || "").toLowerCase();
  const match = Object.keys(FALLBACK_STRINGS).find(
    (locale) => locale.toLowerCase() === segment,
  );
  return match || FALLBACK_DEFAULT_LOCALE;
}

// Landing pages worth offering when the URL someone actually asked for was
// never cached — a fresh app relaunch (the PWA's start_url, a deep link, a
// reload after the phone restarted) can easily land on a page nobody has
// opened yet this session, even though real data is sitting in IndexedDB
// and other page shells ARE cached. Ordered by usefulness offline.
const LANDING_PATH_SUFFIXES = [
  "/dashboard/setlists",
  "/dashboard",
  "/dashboard/songs",
];

/**
 * Finds a cached page to send someone to instead of a dead end, preferring
 * one in the same locale as the page they actually requested, then falling
 * back to any locale we have something cached for. Returns the pathname to
 * redirect to, or undefined if nothing suitable is cached (a genuinely
 * empty/never-synced cache).
 */
async function findCachedLandingPath(cache, requestPathname) {
  const keys = await cache.keys();
  if (keys.length === 0) return undefined;

  const cachedPaths = [];
  for (const key of keys) {
    if (isFreshPage(await cache.match(key))) {
      cachedPaths.push(new URL(key.url).pathname);
    }
  }
  const requestLocale = resolveLocaleFromPathname(requestPathname);

  for (const suffix of LANDING_PATH_SUFFIXES) {
    const match = cachedPaths.find(
      (path) => path === `/${requestLocale}${suffix}`,
    );
    if (match) return match;
  }
  for (const suffix of LANDING_PATH_SUFFIXES) {
    const match = cachedPaths.find((path) => path.endsWith(suffix));
    if (match) return match;
  }
  return undefined;
}

/**
 * The locale prefixes this app serves, mirroring i18n/routing.ts. Used to
 * translate between a locale-less URL and the locale-prefixed ones the
 * cache actually holds — see findCachedPage().
 */
const LOCALES = ["en", "pt-BR", "es"];

function hasLocalePrefix(pathname) {
  const segment = (pathname.split("/")[1] || "").toLowerCase();
  return LOCALES.some((locale) => locale.toLowerCase() === segment);
}

/**
 * Looks for a cached page for this request, in decreasing order of
 * exactness. Only the first step is an obvious lookup; the rest exist
 * because the URL a browser asks for offline is frequently *not* byte-identical
 * to the one that got cached:
 *
 *  2. Query strings. Live Mode is opened as `...&/live?songId=<id>`, which
 *     would miss a cache entry stored for plain `/live`. The page shell is
 *     the same either way — the songId only picks a starting index in
 *     already-cached data — so ignoring the query is correct here, not just
 *     convenient.
 *
 *  3. The locale prefix. Everything cached carries one (`/pt-BR/dashboard/...`,
 *     from both real navigations and the precache targets in
 *     lib/offline/sync.ts). Online, an unprefixed `/dashboard/...` still
 *     resolves because the middleware redirects it — but offline there's no
 *     middleware, so without this step such a URL matches nothing and the
 *     person gets bounced to a generic landing page instead of the setlist
 *     they tapped. The app's own navigation helpers now always add the
 *     prefix up front (lib/offline/navigation.ts), so this is the safety net
 *     for anything that slips past them: an old bookmark, a shared link, a
 *     stray `<a href>`.
 */
async function findCachedPage(cache, request) {
  const exact = await cache.match(request);
  if (isFreshPage(exact)) return exact;

  const ignoringQuery = await cache.match(request, { ignoreSearch: true });
  if (isFreshPage(ignoringQuery)) return ignoringQuery;

  const url = new URL(request.url);
  if (hasLocalePrefix(url.pathname)) return undefined;

  for (const locale of LOCALES) {
    const localized = new URL(url.href);
    localized.pathname = `/${locale}${url.pathname}`;
    const match = await cache.match(localized.href, { ignoreSearch: true });
    if (isFreshPage(match)) return match;
  }

  return undefined;
}

/**
 * Stores a page response under every URL it could later be requested by.
 *
 * `cache.put()` rejects outright on a redirected response ("Cache.put()
 * encountered a redirected response"), and a locale-less URL is *always*
 * redirected here — the middleware rewrites `/dashboard/x` to
 * `/pt-BR/dashboard/x`. So every such navigation used to fail to cache,
 * silently, as an unhandled rejection inside the worker. Rebuilding the
 * response strips the redirect flag and makes it storable; storing it under
 * both the requested URL and the final one means a later offline visit
 * resolves from either direction.
 */
async function cachePage(cache, request, response) {
  try {
    const body = await response.clone().blob();
    // Stamped with the time it was stored, for PAGE_MAX_AGE_MS.
    const headers = new Headers(response.headers);
    headers.set(CACHED_AT_HEADER, String(Date.now()));
    const storable = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    await cache.put(request, storable.clone());

    if (
      response.redirected &&
      response.url &&
      response.url !== request.url &&
      !landsOnPrivatePath(response)
    ) {
      await cache.put(response.url, storable.clone());
    }
  } catch {
    // Caching is always best-effort: the live response has already been
    // returned to the page, and a storage failure (quota, an unclonable
    // body) must never turn a working navigation into a broken one.
  }
}

async function networkFirst(request, event) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    // Only cache a response actually worth replaying offline later — the
    // live page is still returned either way, this only decides whether
    // it's trusted enough to keep around. See isUsableForCache() above.
    //
    // In the background, on a copy: deciding means reading the whole body,
    // and awaiting that here held the page back until the server had
    // finished rendering it, so loading skeletons and streamed sections
    // never showed on a full load.
    const copy = response.clone();
    event.waitUntil(
      (async () => {
        if (await isUsableForCache(copy)) {
          await cachePage(cache, request, copy);
        }
      })().catch(() => {}),
    );
    return response;
  } catch {
    const cached = await findCachedPage(cache, request);
    if (cached) return cached;

    // No cache entry for this exact URL. Rather than dead-end on the
    // generic "not saved" page while synced setlists and songs are ready
    // and waiting in IndexedDB, redirect to whatever page shell we do have
    // cached — the browser re-navigates, this handler runs again, and that
    // URL hits the exact-match branch above. Guarantees offline data is
    // always reachable, not just from the one URL that happened to be open
    // when the app was last closed.
    const requestPathname = new URL(request.url).pathname;
    const landingPath = await findCachedLandingPath(cache, requestPathname);
    if (landingPath && landingPath !== requestPathname) {
      // Absolute: Response.redirect() throws a TypeError on a bare
      // pathname, which inside this catch block would escape as a failed
      // navigation — the exact dead end this fallback exists to avoid.
      return Response.redirect(
        new URL(landingPath, self.location.origin).href,
        302,
      );
    }

    return offlineResponse(cache, requestPathname);
  }
}

/** The generic "you're offline" page. */
async function offlineResponse(cache, requestPathname) {
  const offline = await cache.match(OFFLINE_URL);
  if (offline) return offline;
  const locale = resolveLocaleFromPathname(requestPathname);
  return new Response(
    `<!doctype html><meta charset=utf-8><title>Offline</title>` +
      `<p>${FALLBACK_STRINGS[locale]}</p>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 },
  );
}

/**
 * Private pages (see PRIVATE_PATHS): straight from the network, never
 * stored, and offline only ever the generic offline page, never a cached
 * copy (which older versions of this worker may still have written).
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(PAGES_CACHE);
    return offlineResponse(cache, new URL(request.url).pathname);
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && !forbidsCaching(response)) {
      // Not awaited — the response goes back to the page either way — but
      // the rejection is caught: cache.put() rejects on a redirected or
      // otherwise unstorable response, and an uncaught rejection inside a
      // service worker is a console error on every navigation.
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && !forbidsCaching(response)) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await networkPromise) || Response.error();
}
