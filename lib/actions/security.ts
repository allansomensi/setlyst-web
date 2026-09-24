"use server";

import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  type ActionResult,
} from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import {
  reauthBody,
  sanitizeOtp,
  sanitizeRecoveryCode,
  type ReauthProof,
} from "@/lib/auth-flow";
import type { RecoveryCodes, TwoFactorSetup } from "@/types/account";
import { getTranslations } from "next-intl/server";
import {
  clearPendingGoogleLink,
  readPendingGoogleLink,
} from "@/lib/server/google-link";
import { getSession } from "@/lib/server/session";

/**
 * Two-factor authentication and linked sign-in providers of the
 * signed-in account (`/users/me/2fa/*`, `/users/me/identities/*`).
 */

/**
 * An app code (6 digits) or, where accepted, a recovery code
 * (`XXXX-XXXX`), normalized; null when it is neither.
 */
function secondFactor(code: unknown, allowRecovery: boolean): string | null {
  const raw = typeof code === "string" ? code.trim() : "";
  const digits = sanitizeOtp(raw);
  if (/^\d[\d\s]*$/.test(raw) && digits.length === 6) return digits;
  if (!allowRecovery) return null;
  const recovery = sanitizeRecoveryCode(raw);
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(recovery) ? recovery : null;
}

/**
 * E-mails a 6-digit code proving it's really the account holder, for
 * accounts without a password (Google-only) about to make a sensitive
 * change. The code then goes in the change itself as `reauthCode`.
 */
export async function requestReauthCode(): Promise<ActionResult> {
  return guardedAction(async () => {
    await fetchServerApi<unknown>("/users/me/reauth/code", {
      method: "POST",
      body: "{}",
    });
  });
}

/**
 * Starts the setup: a new secret, valid until confirmed (15 minutes).
 * Needs the password, or an e-mailed code on accounts without one.
 */
export async function startTwoFactorSetup(
  proof: ReauthProof = {},
): Promise<ActionResult<TwoFactorSetup>> {
  const reauth = reauthBody(proof);
  if (!reauth) return invalidRequest();
  return guardedAction(() =>
    fetchServerApi<TwoFactorSetup>("/users/me/2fa/setup", {
      method: "POST",
      body: JSON.stringify(reauth),
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

/**
 * Turns two-factor off: the password (or an e-mailed code on accounts
 * without one), plus a code from the app or a recovery code.
 */
export async function disableTwoFactor(
  input: ReauthProof & { code: string },
): Promise<ActionResult> {
  const clean = secondFactor(input?.code, true);
  const reauth = reauthBody(input);
  if (!clean || !reauth) return invalidRequest();
  return guardedAction(
    async () => {
      await fetchServerApi("/users/me/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ ...reauth, code: clean }),
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

/**
 * Unlinks Google (refused with `PASSWORD_NOT_SET` without a password),
 * with the password (or an e-mailed code) as proof.
 */
export async function unlinkGoogle(
  proof: ReauthProof = {},
): Promise<ActionResult> {
  const reauth = reauthBody(proof);
  if (!reauth) return invalidRequest();
  return guardedAction(
    async () => {
      await fetchServerApi("/users/me/identities/google", {
        method: "DELETE",
        body: JSON.stringify(reauth),
      });
    },
    () => revalidateDashboard("/settings"),
  );
}

/**
 * Links the Google account chosen with "Vincular conta Google"
 * (`POST /users/me/identities/google`): the ID token kept server-side
 * after the Google round trip (lib/auth.ts), plus the password or an
 * e-mailed code as proof. `GOOGLE_LINK_EXPIRED` (web-only code) when
 * there is no pending link for this account any more: start again.
 */
export async function linkGoogle(
  proof: ReauthProof = {},
): Promise<ActionResult> {
  const reauth = reauthBody(proof);
  if (!reauth) return invalidRequest();
  const session = await getSession();
  if (session?.user.impersonator) return invalidRequest();
  const link = await readPendingGoogleLink(session?.user.id);
  if (!link) {
    const t = await getTranslations("security.google.status");
    return {
      success: false,
      apiCode: "GOOGLE_LINK_EXPIRED",
      error: t("expired"),
    };
  }
  const result = await guardedAction(
    async () => {
      await fetchServerApi("/users/me/identities/google", {
        method: "POST",
        body: JSON.stringify({ id_token: link.idToken, ...reauth }),
      });
    },
    () => revalidateDashboard("/settings"),
  );
  // A wrong password or code can be retried with the same token; anything
  // else (linked, token refused, Google account taken) ends this attempt.
  const retryable =
    !result.success &&
    (result.code === "rate_limited" ||
      [
        "REAUTH_REQUIRED",
        "WRONG_PASSWORD",
        "INVALID_CODE",
        "CODE_EXPIRED",
        "INVALID_TWO_FACTOR_CODE",
        "EMAIL_NOT_VERIFIED",
      ].includes(result.apiCode ?? ""));
  if (!retryable) await clearPendingGoogleLink();
  return result;
}

/** Drops a pending "link Google" (the person closed the confirmation). */
export async function cancelGoogleLink(): Promise<void> {
  await clearPendingGoogleLink();
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
