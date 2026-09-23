"use server";

import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  type ActionResult,
} from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import { sanitizeOtp, sanitizeRecoveryCode } from "@/lib/auth-flow";
import type { RecoveryCodes, TwoFactorSetup } from "@/types/account";

/**
 * Two-factor authentication and linked sign-in providers of the
 * signed-in account (`/users/me/2fa/*`, `/users/me/identities/*`).
 */

/**
 * An app code (6 digits) or, where accepted, a recovery code
 * (`XXXX-XXXX`), normalized; null when it is neither.
 */
function secondFactor(code: string, allowRecovery: boolean): string | null {
  const raw = (code ?? "").trim();
  const digits = sanitizeOtp(raw);
  if (/^\d[\d\s]*$/.test(raw) && digits.length === 6) return digits;
  if (!allowRecovery) return null;
  const recovery = sanitizeRecoveryCode(raw);
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(recovery) ? recovery : null;
}

/** Starts the setup: a new secret, valid until confirmed (15 minutes). */
export async function startTwoFactorSetup(
  password?: string,
): Promise<ActionResult<TwoFactorSetup>> {
  if (password && password.length > 256) return invalidRequest();
  return guardedAction(() =>
    fetchServerApi<TwoFactorSetup>("/users/me/2fa/setup", {
      method: "POST",
      body: JSON.stringify({ password: password || undefined }),
    }),
  );
}

/** Confirms the setup with a code from the app; returns recovery codes. */
export async function enableTwoFactor(
  code: string,
): Promise<ActionResult<RecoveryCodes>> {
  const clean = secondFactor(code, false);
  if (!clean) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<RecoveryCodes>("/users/me/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ code: clean }),
      }),
    () => revalidateDashboard("/settings"),
  );
}

/** Turns two-factor off (password when set, plus a code). */
export async function disableTwoFactor(input: {
  password?: string;
  code: string;
}): Promise<ActionResult> {
  const clean = secondFactor(input.code, true);
  if (!clean) return invalidRequest();
  if (input.password && input.password.length > 256) return invalidRequest();
  return guardedAction(
    async () => {
      await fetchServerApi("/users/me/2fa/disable", {
        method: "POST",
        body: JSON.stringify({
          password: input.password || undefined,
          code: clean,
        }),
      });
    },
    () => revalidateDashboard("/settings"),
  );
}

/** Replaces every recovery code (the old ones stop working). */
export async function regenerateRecoveryCodes(
  code: string,
): Promise<ActionResult<RecoveryCodes>> {
  const clean = secondFactor(code, true);
  if (!clean) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<RecoveryCodes>("/users/me/2fa/recovery-codes", {
        method: "POST",
        body: JSON.stringify({ code: clean }),
      }),
    () => revalidateDashboard("/settings"),
  );
}

/** Unlinks Google (refused with `PASSWORD_NOT_SET` without a password). */
export async function unlinkGoogle(): Promise<ActionResult> {
  return guardedAction(
    async () => {
      await fetchServerApi("/users/me/identities/google", {
        method: "DELETE",
      });
    },
    () => revalidateDashboard("/settings"),
  );
}

/**
 * Signs the account out on every device, this one included
 * (`POST /users/me/sessions/revoke`). The caller then has to finish with
 * `secureSignOut`: the current session token no longer works.
 */
export async function revokeAllSessions(): Promise<ActionResult> {
  return guardedAction(async () => {
    await fetchServerApi<{ reauth_required: boolean }>(
      "/users/me/sessions/revoke",
      { method: "POST" },
    );
  });
}
