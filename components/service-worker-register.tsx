"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker (public/sw.js). Renders nothing —
 * mounted once in the root layout so it's active across the whole app,
 * including the public setlist/gig share pages.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[ServiceWorker] registration failed", error);
    });
  }, []);

  return null;
}
