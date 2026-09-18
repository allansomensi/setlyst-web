"use client";

import type { ComponentProps, MouseEvent } from "react";
import { Link as IntlLink } from "@/i18n/routing";
import { isKnownOffline } from "@/lib/offline/navigation";

type IntlLinkProps = ComponentProps<typeof IntlLink>;

/**
 * Drop-in replacement for next-intl's `Link` — used everywhere in place of
 * it so this one change covers every in-app navigation.
 *
 * A normal `<Link>` click does a client-side ("soft") transition: React
 * fetches a flight-data payload for the destination over the network.
 * Unlike a real page navigation, that fetch is NOT a `navigate`-mode
 * request, so the service worker's offline fallback logic (see
 * networkFirst() in public/sw.js) never sees it — it falls through to the
 * generic same-origin GET handler instead, which has no useful cache entry
 * for a flight-data URL to serve. Offline, that fetch simply fails, and
 * depending on the route Next.js either strands the app on an error
 * boundary or silently reverts the navigation — even when the destination
 * page itself is fully cached and would work fine as a real navigation.
 *
 * So: when the browser is offline at the moment of the click, this forces
 * a real, full navigation (`window.location`) instead of a soft one. That
 * goes through the service worker's networkFirst() and its
 * cached-landing-page fallback, and reliably resolves to whatever is
 * actually cached. Online, this behaves exactly like next-intl's Link —
 * no change to the normal, instant client-side transition.
 *
 * `<Link>` is only half the story: anything that navigates *programmatically*
 * (clicking a table row, jumping into Live Mode) needs the same treatment,
 * which is what hooks/use-app-router.ts provides. Both share the decision
 * logic in lib/offline/navigation.ts.
 *
 * No locale handling is needed here: next-intl's `Link` has already
 * resolved `href` into a locale-prefixed URL by the time the DOM node
 * exists, and `event.currentTarget.href` reads that resolved value.
 */
export function Link({ onClick, ...props }: IntlLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!isKnownOffline()) return;

    // Modifier/middle clicks and explicit new-tab targets are left to the
    // browser's own default handling either way.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === "_blank"
    ) {
      return;
    }

    event.preventDefault();
    window.location.href = event.currentTarget.href;
  }

  return <IntlLink onClick={handleClick} {...props} />;
}
