/**
 * Reading the sign-in activity (`GET /users/me/sign-ins`): which labels
 * a recorded `method` stands for. Pure, shared by the security settings
 * and unit tested.
 */

import type { SignInEvent } from "@/types/operations";

/** The parts of a sign-in method the app has a label for. */
export const SIGN_IN_METHOD_PARTS = [
  "password",
  "google",
  "two_factor",
] as const;
export type SignInMethodPart = (typeof SIGN_IN_METHOD_PARTS)[number];

/**
 * The known parts of `method`, in order: the API records a first factor
 * and, after a second step, `+two_factor` (`password+two_factor`,
 * `google+two_factor`). Unknown parts are dropped (a newer API may add
 * some), and a method with none known answers an empty list.
 */
export function signInMethodParts(
  method: string | null | undefined,
): SignInMethodPart[] {
  if (!method) return [];
  const parts: SignInMethodPart[] = [];
  for (const raw of method.split("+")) {
    const part = raw.trim().toLowerCase();
    if (
      (SIGN_IN_METHOD_PARTS as readonly string[]).includes(part) &&
      !parts.includes(part as SignInMethodPart)
    ) {
      parts.push(part as SignInMethodPart);
    }
  }
  return parts;
}

/** A failed attempt that got past the password: the code was wrong. */
export function isWrongSecondFactor(event: SignInEvent): boolean {
  return event.outcome !== "succeeded" && event.second_factor;
}

/** Failed attempts and lockouts among `events`. */
export function countFailedSignIns(events: readonly SignInEvent[]): number {
  return events.filter((event) => event.outcome !== "succeeded").length;
}
