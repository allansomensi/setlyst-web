"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

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
 *
 * Fullscreen belongs to the document, not to the screen that asked for it:
 * leaving Live Mode through its close button is a client-side navigation,
 * so the dashboard used to open still in fullscreen, with no control on it
 * to leave. Fullscreen this hook entered is left again on unmount; one the
 * person entered themselves (F11, the browser's menu) is left alone.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Whether the fullscreen currently on was requested from here.
  const enteredHere = useRef(false);

  useEffect(() => {
    const syncState = () => {
      const active = Boolean(document.fullscreenElement);
      // Left some other way (Escape, the browser's own control): nothing of
      // ours to undo any more.
      if (!active) enteredHere.current = false;
      setIsFullscreen(active);
    };

    syncState();
    document.addEventListener("fullscreenchange", syncState);
    return () => {
      document.removeEventListener("fullscreenchange", syncState);
      if (enteredHere.current && document.fullscreenElement) {
        enteredHere.current = false;
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement
        .requestFullscreen()
        .then(() => {
          enteredHere.current = true;
        })
        .catch(() => {});
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
