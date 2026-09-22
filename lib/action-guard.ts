import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "@/lib/api-server";
import { getTranslations } from "next-intl/server";

export type ActionErrorCode = "rate_limited";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | {
      success: false;
      error: string;
      /**
       * Set when the failure needs different handling from an ordinary
       * error — right now only rate limiting, where the right move is to
       * wait rather than fix anything. See lib/action-toast.tsx.
       */
      code?: ActionErrorCode;
      /** Seconds until retrying makes sense, when the backend said so. */
      retryAfterSeconds?: number;
    };

const GENERIC_ERROR = "An unexpected error occurred. Please try again.";

/**
 * A rate-limited request gets its own, translated message: the English
 * string the API layer puts on the error is fine for logs, but this one
 * is read by the person, in their language, and has to tell them to wait
 * — and for how long, when the backend said.
 */
async function toRateLimitedResult(
  error: ApiError,
): Promise<Extract<ActionResult, { success: false }>> {
  const t = await getTranslations("rateLimit");
  const retryAfterSeconds =
    error.retryAfterMs != null
      ? Math.max(1, Math.ceil(error.retryAfterMs / 1000))
      : undefined;

  return {
    success: false,
    code: "rate_limited",
    retryAfterSeconds,
    error:
      retryAfterSeconds != null
        ? t("messageWithWait", { seconds: retryAfterSeconds })
        : t("message"),
  };
}

/**
 * Turns a thrown error into something safe to show a user.
 *
 * A 4xx from the backend is a message *about the request* — "that title is
 * already taken", "you don't have permission" — and is worth surfacing
 * verbatim, since it's the only thing that tells the person what to do
 * differently. Anything else is not: a 5xx body can carry a database
 * error, a panic message or a stack trace, and every one of these strings
 * ends up rendered in a toast. Those collapse to a generic message, with
 * the real one kept in the server logs where it's actually useful.
 */
function toClientMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status >= 400 && error.status < 500) {
      return error.message || GENERIC_ERROR;
    }
    console.error(
      "[guardedAction] Upstream error:",
      error.status,
      error.message,
    );
    return GENERIC_ERROR;
  }

  console.error("[guardedAction] Unhandled error:", error);
  return GENERIC_ERROR;
}

/**
 * The failure half of guardedAction, for the few actions that do their own
 * session/permission checks and so can't use it directly: gives them the
 * same rate-limit handling and the same "don't leak 5xx bodies" rule.
 * `fallback` replaces the generic message for non-4xx failures.
 */
export async function toActionFailure(
  error: unknown,
  fallback?: string,
): Promise<Extract<ActionResult, { success: false }>> {
  if (error instanceof ApiError && error.status === 429) {
    return toRateLimitedResult(error);
  }
  const message = toClientMessage(error);
  return {
    success: false,
    error: message === GENERIC_ERROR && fallback ? fallback : message,
  };
}

/**
 * Wraps a Server Action with authentication and error handling.
 * Throws if the user is not authenticated or the session is expired.
 * Returns a typed ActionResult to avoid leaking stack traces to clients.
 */
export async function guardedAction<T>(
  fn: () => Promise<T>,
  revalidateFn?: () => void,
): Promise<ActionResult<T>> {
  const session = await getServerSession(authOptions);

  if (!session || session.error === "TokenExpired") {
    return { success: false, error: "Unauthorized. Please sign in again." };
  }

  try {
    const result = await fn();
    revalidateFn?.();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      return toRateLimitedResult(error);
    }
    return { success: false, error: toClientMessage(error) };
  }
}

/**
 * Returns the current session or throws if unauthenticated.
 * Use inside Server Actions that need to read the session.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session || session.error === "TokenExpired") {
    throw new Error("Unauthorized");
  }

  return session;
}
