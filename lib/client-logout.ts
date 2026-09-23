"use client";

import { signOut, type SignOutParams } from "next-auth/react";
import { destroyOfflineData } from "@/lib/offline/owner";

/**
 * Signs out and removes everything this device kept for offline use.
 *
 * A plain `signOut()` only drops the session cookie: the offline mirror
 * (IndexedDB) and the pages the service worker cached would stay readable
 * to whoever uses the device next (audit M5). Every sign-out path in the
 * app goes through here: the sidebar button, the change-password screen,
 * a revoked session and a 401 from a client-side API call.
 *
 * Cleanup is best-effort and time-boxed: a broken IndexedDB must never
 * keep someone signed in.
 */
export async function secureSignOut(
  options: SignOutParams<true> = {},
): Promise<void> {
  try {
    await destroyOfflineData();
  } finally {
    await signOut(options);
  }
}
