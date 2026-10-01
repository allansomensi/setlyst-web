"use client";

import { useEffect, useEffectEvent } from "react";
import { getCurrentMaintenanceMode } from "@/lib/actions/platform";

/** At most one automatic recovery this often (no refresh loop for staff,
 * who are never refused but can still hit a real crash meanwhile). */
const RECOVERY_INTERVAL_MS = 30_000;
let lastRecovery = 0;

/**
 * For error boundaries: when full maintenance was switched on while the
 * person was already in the app, the pages they open next fail on the
 * API's refusal, and in production the boundary can't read why (server
 * errors reach the client without their message). The layouts render
 * the maintenance screen instead of the app, but only when they run
 * again: this checks the platform once and, during full maintenance,
 * calls `recover` (a refresh) so the person lands on that screen
 * instead of "Something went wrong".
 */
export function useMaintenanceRecovery(recover: () => void) {
  const onFullMaintenance = useEffectEvent(recover);

  useEffect(() => {
    if (Date.now() - lastRecovery < RECOVERY_INTERVAL_MS) return;
    let cancelled = false;
    getCurrentMaintenanceMode()
      .then((mode) => {
        if (cancelled || mode !== "full") return;
        lastRecovery = Date.now();
        onFullMaintenance();
      })
      .catch(() => {
        // Offline or the app server is unreachable: nothing to learn.
      });
    return () => {
      cancelled = true;
    };
  }, []);
}
