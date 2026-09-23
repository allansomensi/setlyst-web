"use client";

import { useEffect } from "react";
import { toast } from "@/lib/toast";
import { isServiceWorkerEnabled } from "@/lib/offline/sw-enabled";

/**
 * Registers the offline service worker (public/sw.js) and, when a new
 * version is already waiting, offers a manual "reload to update" instead of
 * ever swapping it out from under someone. Renders nothing — mounted once
 * in the root layout so it's active across the whole app, including the
 * public setlist/gig share pages.
 *
 * Deliberately outside next-intl's context (that provider only wraps
 * `app/[locale]`, not the public `/s/[token]` share routes this component
 * also needs to cover), so it resolves its own tiny, locale-only string set
 * from the URL the same way public/offline.html and public/sw.js do —
 * these three are kept in sync by hand.
 */
const STRINGS = {
  en: {
    message: "A new version of Setlyst is available.",
    reload: "Reload",
  },
  "pt-BR": {
    message: "Uma nova versão do Setlyst está disponível.",
    reload: "Recarregar",
  },
  es: {
    message: "Hay una nueva versión de Setlyst disponible.",
    reload: "Recargar",
  },
} as const;
type Locale = keyof typeof STRINGS;
const DEFAULT_LOCALE: Locale = "en";

function resolveLocale(): Locale {
  const segment = (window.location.pathname.split("/")[1] || "").toLowerCase();
  const match = (Object.keys(STRINGS) as Locale[]).find(
    (locale) => locale.toLowerCase() === segment,
  );
  return match ?? DEFAULT_LOCALE;
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!isServiceWorkerEnabled()) {
      // Development: remove a worker left over from an earlier session
      // (or a production build on the same origin), which would keep
      // serving cached pages and pre-caching in the background.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((r) => r.unregister())),
        )
        .catch(() => {});
      return;
    }

    const strings = STRINGS[resolveLocale()];

    // A controllerchange fires both the first time a worker ever takes
    // control of a page AND on every later update. Reloading on the first
    // one would refresh every new visitor's very first load for no reason;
    // only an update — this page already had a controller before — should
    // trigger it, and only once the person has approved it (see below).
    const hadControllerAtLoad = Boolean(navigator.serviceWorker.controller);
    let hasReloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadControllerAtLoad || hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    });

    const notifyUpdate = (worker: ServiceWorker) => {
      toast(strings.message, {
        duration: Infinity,
        action: {
          label: strings.reload,
          onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
        },
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // A worker was already installed-and-waiting when this tab showed
        // up (e.g. an update landed while this tab sat in the background).
        if (registration.waiting && registration.active) {
          notifyUpdate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            // `registration.active` being set means this install replaces
            // an already-running worker — an update, not the first-ever
            // install for this browser, which needs no prompt.
            if (installingWorker.state === "installed" && registration.active) {
              notifyUpdate(installingWorker);
            }
          });
        });
      })
      .catch((error) => {
        console.error("[ServiceWorker] registration failed", error);
      });
  }, []);

  return null;
}
