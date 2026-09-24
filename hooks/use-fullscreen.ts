"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Tracks and toggles document fullscreen.
 *
 * The state is driven by the browser's own `fullscreenchange` event rather
 * than set optimistically when the toggle is pressed. Fullscreen can be
 * left in ways the app never hears about otherwise — Escape, F11, the
 * browser's own exit affordance, an OS gesture — and a locally-tracked
 * flag gets stuck showing "exit fullscreen" on a window that is no longer
 * fullscreen, so the next press does nothing visible.
 *
 * `requestFullscreen()` also rejects when the browser declines it (no user
 * gesture, an iframe without the permission, iOS Safari, which doesn't
 * implement it on non-video elements at all). Left unhandled that surfaces
 * as an unhandled promise rejection; here it just means the screen stays
 * as it is.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncState = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));

    syncState();
    document.addEventListener("fullscreenchange", syncState);
    return () => document.removeEventListener("fullscreenchange", syncState);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  /**
   * Whether the browser offers fullscreen at all — used to hide a dead
   * control. Read through useSyncExternalStore so the server render (which
   * can't know) and hydration agree, then the real answer applies.
   */
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    detectSupport,
    () => false,
  );

  return { isFullscreen, toggle, isSupported };
}

const noopSubscribe = () => () => {};

function detectSupport(): boolean {
  return typeof document.documentElement?.requestFullscreen === "function";
}
