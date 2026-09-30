"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * How often a page left open (an installed app kept in the background for
 * days) re-asks when it comes back to the foreground: its copy of
 * `renewDue` dates from when it loaded. The server only calls the API when
 * the token is actually due, so a check is one cheap cookie round-trip.
 */
const RECHECK_INTERVAL_MS = 60 * 60 * 1000;
/** Floor between two attempts, so a failing renewal never loops. */
const MIN_ATTEMPT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Keeps a session in use from running out: when the server reports its
 * API token as due for renewal (`session.renewDue`, see lib/auth.ts), asks
 * for a fresh one through `update({ renewSession: true })` — on load and
 * whenever the app comes back to the foreground (an installed app left
 * open in the background for days). The renewed token is written to the
 * session cookie by that same request; nothing else changes on the page.
 * Offline, the request simply fails and the next wake-up tries again.
 */
export function SessionKeepAlive() {
  const { data: session, update } = useSession();
  const renewDue = session?.renewDue === true;
  const lastCheck = useRef<number | null>(null);

  useEffect(() => {
    const renew = (force: boolean) => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      const now = Date.now();
      const since =
        lastCheck.current === null ? Infinity : now - lastCheck.current;
      if (since < (force ? MIN_ATTEMPT_INTERVAL_MS : RECHECK_INTERVAL_MS)) {
        return;
      }
      lastCheck.current = now;
      void update({ renewSession: true }).catch(() => {});
    };
    const onWake = () => renew(false);

    if (renewDue) renew(true);
    else lastCheck.current ??= Date.now();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [renewDue, update]);

  return null;
}
