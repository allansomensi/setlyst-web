"use client";

import { toast } from "@/lib/toast";
import { secureSignOut } from "@/lib/client-logout";
import { Clock, Eye, KeyRound, LogOut } from "lucide-react";
import type { ActionErrorCode } from "@/lib/action-guard";
import { isNoChangeError } from "@/lib/api-errors";

/** Base visible time for a rate-limit notice, before any Retry-After. */
const RATE_LIMIT_MIN_DURATION_MS = 6000;
/** Never keep a notice up longer than this, whatever the server asked. */
const RATE_LIMIT_MAX_DURATION_MS = 15000;

function localePrefix(): string {
  if (typeof window === "undefined") return "";
  const segment = window.location.pathname.split("/")[1];
  return segment ? `/${segment}` : "";
}

/**
 * Shows the error from a failed Server Action.
 *
 * Almost every failure is an ordinary error toast. The exceptions need a
 * different response than "fix something and retry":
 *
 * - **rate limited** — nothing was wrong; wait. Warning style, clock icon,
 *   visible at least as long as the wait the backend asked for.
 * - **session revoked** — the password changed elsewhere, the account was
 *   suspended or signed out everywhere. Sign out and go to the login page.
 * - **password change required** — go to the mandatory change screen.
 * - **read only** — the person is viewing as another user; nothing to fix.
 * - **no changes** (`UNPROCESSABLE_ENTITY`) — nothing to save; an info
 *   toast, see `isNoChangeError`.
 */
export function toastActionError(result: object, message: string) {
  // Typed loosely on purpose: not every action returns a guardedAction
  // ActionResult (a few hand-roll `{ success, error }`), and those simply
  // never carry a `code`, so they fall through to a normal error toast.
  // "Nothing changed" is not a failure: the form is already saved.
  if (isNoChangeError(result)) {
    toast.info(message, { id: "no-changes" });
    return;
  }

  const { code, retryAfterSeconds } = result as {
    code?: ActionErrorCode;
    retryAfterSeconds?: number;
  };

  switch (code) {
    case "rate_limited": {
      const waitMs = (retryAfterSeconds ?? 0) * 1000;
      toast.warning(message, {
        id: "rate-limited",
        icon: <Clock className="h-4 w-4" />,
        duration: Math.min(
          RATE_LIMIT_MAX_DURATION_MS,
          Math.max(RATE_LIMIT_MIN_DURATION_MS, waitMs),
        ),
      });
      return;
    }
    case "session_revoked":
      toast.error(message, {
        id: "session-revoked",
        icon: <LogOut className="h-4 w-4" />,
      });
      void secureSignOut({
        callbackUrl: `${localePrefix()}/login?reason=session`,
      });
      return;
    case "password_change_required":
      toast.warning(message, {
        id: "password-change-required",
        icon: <KeyRound className="h-4 w-4" />,
      });
      // A full navigation on purpose: the session must be re-read, and
      // this runs outside any component (no router available).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `${localePrefix()}/change-password`;
      return;
    case "read_only":
      toast.info(message, {
        id: "impersonation-read-only",
        icon: <Eye className="h-4 w-4" />,
      });
      return;
    default:
      toast.error(message);
  }
}
