import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

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
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return { success: false, error: message };
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
