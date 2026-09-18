"use client";

import { useCallback, useMemo } from "react";
import { useLocale } from "next-intl";
import { useRouter as useIntlRouter } from "@/i18n/routing";
import { isKnownOffline, localizeHref } from "@/lib/offline/navigation";

/**
 * The app's router. Use this instead of `useRouter` from `next/navigation`
 * or from `@/i18n/routing` for anything that navigates.
 *
 * It is next-intl's router (so every path is locale-correct without
 * callers hand-writing a prefix), plus the same offline handling
 * components/nav-link.tsx gives `<Link>` clicks: with no connection,
 * `push`/`replace` do a real browser navigation that the service worker
 * can answer from cache, instead of a client-side transition that quietly
 * fails.
 *
 * That gap is what made tapping a row in a list — a setlist, a song, a gig
 * — appear to do nothing offline: those rows navigate programmatically, so
 * they never went through `<Link>`'s offline path. See
 * lib/offline/navigation.ts for the full reasoning.
 *
 * `back`, `forward` and `refresh` are passed straight through: history
 * moves are handled by the browser (and replayed through the service
 * worker) with no help needed, and `refresh` is a no-op offline by design.
 */
export function useAppRouter() {
  const intlRouter = useIntlRouter();
  const locale = useLocale();

  const navigate = useCallback(
    (href: string, mode: "push" | "replace") => {
      if (isKnownOffline()) {
        const target = localizeHref(href, locale);
        if (mode === "replace") {
          window.location.replace(target);
        } else {
          window.location.assign(target);
        }
        return;
      }

      // next-intl types `href` against the routing config's `pathnames`
      // map. This app doesn't define one (see i18n/routing.ts), so every
      // path is a plain string — the cast keeps that single assertion here
      // instead of at each of the couple dozen call sites.
      intlRouter[mode](href as never);
    },
    [intlRouter, locale],
  );

  return useMemo(
    () => ({
      push: (href: string) => navigate(href, "push"),
      replace: (href: string) => navigate(href, "replace"),
      back: () => intlRouter.back(),
      forward: () => intlRouter.forward(),
      refresh: () => intlRouter.refresh(),
    }),
    [navigate, intlRouter],
  );
}
