"use client";

import { toast } from "sonner";
import { Clock } from "lucide-react";
import type { ActionErrorCode } from "@/lib/action-guard";

/** Base visible time for a rate-limit notice, before any Retry-After. */
const RATE_LIMIT_MIN_DURATION_MS = 6000;
/** Never keep a notice up longer than this, whatever the server asked. */
const RATE_LIMIT_MAX_DURATION_MS = 15000;

/**
 * Shows the error from a failed Server Action.
 *
 * Almost every failure is an ordinary error toast. Rate limiting is the
 * exception: nothing about the request was wrong, so a red "error" reads
 * as if the person did something they need to fix — when all they need to
 * do is wait. It gets a warning style instead, a clock icon, and stays up
 * long enough to actually be read (at least as long as the wait the
 * backend asked for, within reason), so it doesn't vanish while someone
 * is still wondering why their save didn't go through.
 */
export function toastActionError(result: object, message: string) {
  // Typed loosely on purpose: not every action returns a guardedAction
  // ActionResult (a few hand-roll `{ success, error }`), and those simply
  // never carry a `code`, so they fall through to a normal error toast.
  const { code, retryAfterSeconds } = result as {
    code?: ActionErrorCode;
    retryAfterSeconds?: number;
  };

  if (code === "rate_limited") {
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

  toast.error(message);
}
