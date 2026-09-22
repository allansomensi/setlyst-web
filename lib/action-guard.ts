import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "@/lib/api-server";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const GENERIC_ERROR = "An unexpected error occurred. Please try again.";

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
