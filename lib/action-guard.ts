import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "@/lib/api-server";
import { describeApiError } from "@/lib/api-errors";
import { getLocale, getTranslations } from "next-intl/server";

export type ActionErrorCode =
  "rate_limited" | "password_change_required" | "session_revoked" | "read_only";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | {
      success: false;
      error: string;
      /**
       * Set when the failure needs different handling from an ordinary
       * error — waiting (rate limiting), re-authenticating, or leaving a
       * read-only session. See lib/action-toast.tsx.
       */
      code?: ActionErrorCode;
      /** The API's own error code, for callers that react to specifics. */
      apiCode?: string;
      /** Structured context from the API (e.g. password issues). */
      meta?: Record<string, unknown>;
      /** Seconds until retrying makes sense, when the backend said so. */
      retryAfterSeconds?: number;
    };

export type ActionFailure = Extract<ActionResult, { success: false }>;

/**
 * A rate-limited request gets its own, translated message: it has to tell
 * the person to wait — and for how long, when the backend said.
 */
async function toRateLimitedResult(error: ApiError): Promise<ActionFailure> {
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

const SPECIAL_CODES: Record<string, ActionErrorCode> = {
  PASSWORD_CHANGE_REQUIRED: "password_change_required",
  SESSION_REVOKED: "session_revoked",
  IMPERSONATION_READ_ONLY: "read_only",
};

/**
 * Turns a thrown error into something safe — and readable — to show a
 * user.
 *
 * Known API error codes get a message in the user's language (see
 * lib/api-errors.ts); other 4xx responses get a translated generic
 * sentence (the API's own message is English and meant for developers).
 * Anything else (a 5xx body can carry a database error or a stack trace)
 * collapses to a generic message, with the real one kept in the server
 * logs.
 */
async function toFailure(
  error: unknown,
  fallback?: string,
): Promise<ActionFailure> {
  const tGeneric = await getTranslations("apiErrors");
  const generic = fallback ?? tGeneric("generic");

  if (!(error instanceof ApiError)) {
    console.error("[guardedAction] Unhandled error:", error);
    return { success: false, error: generic };
  }

  // A bare 429 is the per-IP limiter. A 429 with a code is a business rule
  // (`TOO_MANY_ATTEMPTS`, `ACCOUNT_LOCKED`) whose meta says how long to
  // wait: translate it like any other code, keeping the wait.
  if (error.status === 429 && !error.code) return toRateLimitedResult(error);
  if (error.status === 429) {
    const retry = error.meta?.retry_after_seconds;
    const translated = describeApiError(
      error.code,
      error.meta,
      (key, values) => tGeneric(key, values),
      await getLocale(),
    );
    if (translated) {
      return {
        success: false,
        code: "rate_limited",
        apiCode: error.code ?? undefined,
        meta: error.meta ?? undefined,
        retryAfterSeconds:
          typeof retry === "number" && retry > 0 ? Math.ceil(retry) : undefined,
        error: translated,
      };
    }
    return toRateLimitedResult(error);
  }

  const base = {
    success: false as const,
    apiCode: error.code ?? undefined,
    meta: error.meta ?? undefined,
    code: error.code ? SPECIAL_CODES[error.code] : undefined,
  };

  const translated = describeApiError(
    error.code,
    error.meta,
    (key, values) => tGeneric(key, values),
    await getLocale(),
  );
  if (translated) return { ...base, error: translated };

  if (error.status === 401) {
    return {
      ...base,
      code: "session_revoked",
      error: tGeneric("SESSION_REVOKED"),
    };
  }

  if (error.status >= 400 && error.status < 500) {
    // An untranslated code: the API's message is English prose meant for
    // developers, so the person gets a translated sentence instead.
    console.warn(
      "[guardedAction] Untranslated API error:",
      error.status,
      error.code,
      error.message,
    );
    return { ...base, error: fallback ?? tGeneric("rejected") };
  }

  if (error.status === 503 || error.status === 504) {
    return { ...base, error: tGeneric("unavailable") };
  }

  console.error("[guardedAction] Upstream error:", error.status, error.message);
  return { ...base, error: generic };
}

/**
 * The failure half of guardedAction, for actions that do their own
 * session/permission checks and so can't use it directly. `fallback`
 * replaces the generic message for unexpected failures.
 */
export async function toActionFailure(
  error: unknown,
  fallback?: string,
): Promise<ActionFailure> {
  return toFailure(error, fallback);
}

/**
 * The result of an action refused before reaching the API (malformed id,
 * unknown filter...), in the visitor's language. Such input never comes
 * from the app's own UI, so the generic "rejected" message is enough.
 */
export async function invalidRequest<T = never>(): Promise<ActionResult<T>> {
  const t = await getTranslations("apiErrors");
  return { success: false, error: t("rejected") };
}

/**
 * Wraps a Server Action with authentication and error handling.
 * Returns a typed ActionResult so stack traces never reach clients.
 */
export async function guardedAction<T>(
  fn: () => Promise<T>,
  revalidateFn?: () => void,
): Promise<ActionResult<T>> {
  const session = await getServerSession(authOptions);

  if (!session || session.error === "TokenExpired") {
    const t = await getTranslations("apiErrors");
    return {
      success: false,
      code: "session_revoked",
      error: t("SESSION_REVOKED"),
    };
  }

  try {
    const result = await fn();
    revalidateFn?.();
    return { success: true, data: result };
  } catch (error) {
    return toFailure(error);
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

/** Like requireSession, but also requires a staff role. */
export async function requireStaff(adminOnly = false) {
  const session = await requireSession();
  const role = session.user.role;
  if (role !== "admin" && (adminOnly || role !== "moderator")) {
    throw new ApiError(403, "Forbidden", null, "FORBIDDEN");
  }
  return session;
}
