import "server-only";

import { cookies } from "next/headers";
import {
  GOOGLE_LINK_COOKIE,
  parseGoogleLink,
  type PendingGoogleLink,
} from "@/lib/auth-flow";

/**
 * The Google ID token waiting for the "link Google" confirmation in the
 * settings (see GOOGLE_LINK_COOKIE), when it was obtained by `userId` and
 * hasn't expired. Never sent to the browser.
 */
export async function readPendingGoogleLink(
  userId: string | null | undefined,
): Promise<PendingGoogleLink | null> {
  if (!userId) return null;
  try {
    const link = parseGoogleLink(
      (await cookies()).get(GOOGLE_LINK_COOKIE)?.value,
    );
    return link && link.userId === userId ? link : null;
  } catch {
    return null;
  }
}

/** Forgets the pending link (done, canceled or refused for good). */
export async function clearPendingGoogleLink(): Promise<void> {
  try {
    (await cookies()).delete(GOOGLE_LINK_COOKIE);
  } catch {
    // Read-only cookies (a server component render): it expires anyway.
  }
}
