"use client";

import { useEffect } from "react";

/**
 * Holds a screen wake lock for as long as the component is mounted, so the
 * phone propped on a music stand doesn't dim and lock halfway through a
 * song.
 *
 * The re-acquisition on `visibilitychange` is the part that actually makes
 * this work in practice. A wake lock is released automatically by the
 * browser whenever the page stops being visible — switching apps to check
 * a message, the screen timing out once before the lock was taken, an
 * incoming call — and it is *not* restored when the page comes back. A
 * one-shot request on mount therefore protects only the stretch up to the
 * first interruption, which on stage is exactly when it stops mattering.
 *
 * Every failure path is silent by design: wake locks are unsupported on
 * some browsers, and a request can be rejected outright (a background tab,
 * battery saver). Neither is worth interrupting a performance over, and
 * the screen timing out is a far smaller problem than a toast covering the
 * lyrics.
 */
export function useWakeLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      // Requesting while hidden always rejects — wait for the next
      // visibility change instead of burning a rejected promise.
      if (cancelled || document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;

      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release().catch(() => {});
          sentinel = null;
        }
      } catch {
        // Unsupported, denied, or the document lost visibility mid-request.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [enabled]);
}
