import { routing } from "@/i18n/routing";

/**
 * The one place that decides *how* an in-app navigation should happen when
 * the network may be gone, shared by every navigation entry point in the
 * app (components/nav-link.tsx for `<Link>` clicks, hooks/use-app-router.ts
 * for programmatic `router.push`/`replace`).
 *
 * Both halves of this matter, and getting either one wrong produces the
 * same user-visible symptom — a tap that visibly *tries* to open something
 * and then silently lands nowhere:
 *
 *  1. Next.js' App Router resolves a client-side ("soft") transition by
 *     fetching an RSC payload over the network. That fetch is NOT a
 *     `navigate`-mode request, so the service worker's offline handling
 *     (networkFirst() in public/sw.js) never sees it and can't substitute a
 *     cached page. With no connection the fetch just fails and the router
 *     abandons the transition — even when the destination page is sitting
 *     fully cached and would render perfectly as a real navigation. So
 *     while offline, we bypass the router entirely and do a real browser
 *     navigation, which the service worker *can* serve from cache.
 *
 *  2. A real browser navigation is matched against the cache by URL, and
 *     the offline cache is populated with locale-prefixed URLs (see the
 *     precache targets in lib/offline/sync.ts: `/pt-BR/dashboard/...`).
 *     Online, an unprefixed `/dashboard/...` still works because the
 *     middleware redirects it — but offline there is no middleware, so an
 *     unprefixed URL matches nothing in the cache and the service worker
 *     falls back to a generic landing page. To the person tapping a
 *     setlist, that looks exactly like being bounced back to the list they
 *     started from. So any URL we hand to the browser gets its locale
 *     prefix added up front.
 */

const LOCALES = routing.locales as readonly string[];

/**
 * Whether this navigation has to be handed to the browser instead of the
 * router. Deliberately checked at click time rather than subscribed to:
 * what matters is connectivity at the moment of the tap.
 *
 * `navigator.onLine === false` is the trustworthy half of that API — it
 * means the device has no network interface at all. (`true` merely means
 * *some* interface exists, which is why the rest of the app never treats it
 * as proof of a working connection.) A false negative here is harmless: the
 * soft transition is attempted, fails, and Next.js falls back to a real
 * navigation on its own.
 */
export function isKnownOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Adds the current locale prefix to an app-internal path, so the URL handed
 * to the browser matches what the offline cache actually holds. Paths that
 * already carry a locale, and anything that isn't a root-relative in-app
 * path (absolute URLs, protocol-relative URLs), are returned untouched.
 */
export function localizeHref(href: string, locale: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const pathname = href.split(/[?#]/)[0];
  const firstSegment = pathname.split("/")[1] ?? "";
  if (LOCALES.includes(firstSegment)) return href;

  return `/${locale}${href}`;
}
