"use server";

import { getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, type ActionResult } from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import { LEGAL_VERSION } from "@/lib/legal";
import { reauthBody, sanitizeOtp, type ReauthProof } from "@/lib/auth-flow";
import { apiPath } from "@/lib/api-endpoint";
import { isUuid } from "@/lib/uuid";
import type { User } from "@/types/api";
import {
  REPORT_REASONS,
  type CodeSentResponse,
  type CommunicationSettings,
  type ReportReason,
  type UpdateCommunicationPayload,
} from "@/types/account";
import { COMMUNICATION_CATEGORIES } from "@/types/public";

/**
 * Self-service account actions: e-mail verification and change, consent
 * to the terms, communication preferences, reporting a profile and
 * deleting the account. Every input is re-checked here before it reaches
 * the API (which validates again).
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function invalid<T>(): Promise<ActionResult<T>> {
  const t = await getTranslations("apiErrors");
  return { success: false, error: t("rejected") };
}

function sixDigits(code: unknown): string | null {
  const clean = sanitizeOtp(typeof code === "string" ? code : "");
  return clean.length === 6 ? clean : null;
}

/** Sends a verification code to the account's current e-mail. */
export async function sendEmailVerification(): Promise<
  ActionResult<CodeSentResponse>
> {
  return guardedAction(() =>
    fetchServerApi<CodeSentResponse>("/users/me/email/verification", {
      method: "POST",
    }),
  );
}

/** Confirms the current e-mail address with the code it received. */
export async function verifyEmail(code: string): Promise<ActionResult<User>> {
  const clean = sixDigits(code);
  if (!clean) return invalid();
  return guardedAction(
    () =>
      fetchServerApi<User>("/users/me/email/verify", {
        method: "POST",
        body: JSON.stringify({ code: clean }),
      }),
    () => revalidateDashboard("", "layout"),
  );
}

/**
 * Starts an e-mail change: a code goes to the NEW address. Needs proof of
 * identity: the password when the account has one, otherwise a code sent
 * to the current address (`reauthCode`); plus a two-factor `code` when
 * two-factor authentication is on.
 */
export async function startEmailChange(
  input: ReauthProof & { newEmail: string; code?: string },
): Promise<ActionResult<CodeSentResponse>> {
  const email =
    typeof input?.newEmail === "string" ? input.newEmail.trim() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return invalid();
  const reauth = reauthBody(input);
  if (!reauth) return invalid();
  let code: string | undefined;
  if (input.code !== undefined && input.code !== "") {
    const clean = sixDigits(input.code);
    if (!clean) return invalid();
    code = clean;
  }
  return guardedAction(() =>
    fetchServerApi<CodeSentResponse>("/users/me/email/change", {
      method: "POST",
      body: JSON.stringify({ new_email: email, ...reauth, code }),
    }),
  );
}

/** Applies a pending e-mail change with the code sent to the new address. */
export async function confirmEmailChange(
  code: string,
): Promise<ActionResult<User>> {
  const clean = sixDigits(code);
  if (!clean) return invalid();
  return guardedAction(
    () =>
      fetchServerApi<User>("/users/me/email/change/confirm", {
        method: "POST",
        body: JSON.stringify({ code: clean }),
      }),
    () => revalidateDashboard("", "layout"),
  );
}

/** Accepts the Terms of Use and Privacy Policy in force. */
export async function acceptCurrentTerms(): Promise<ActionResult<User>> {
  return guardedAction(
    () =>
      fetchServerApi<User>("/users/me/accept-terms", {
        method: "POST",
        body: JSON.stringify({ version: LEGAL_VERSION }),
      }),
    () => revalidateDashboard("", "layout"),
  );
}

/** Saves the e-mail / in-app switches of the categories sent. */
export async function updateCommunication(
  categories: UpdateCommunicationPayload["categories"],
): Promise<ActionResult<CommunicationSettings>> {
  const clean: UpdateCommunicationPayload["categories"] = {};
  for (const [key, value] of Object.entries(categories ?? {})) {
    if (
      !(COMMUNICATION_CATEGORIES as readonly string[]).includes(key) ||
      key === "security" ||
      typeof value?.email !== "boolean" ||
      typeof value?.in_app !== "boolean"
    ) {
      continue;
    }
    clean[key as keyof typeof clean] = {
      email: value.email,
      in_app: value.in_app,
    };
  }
  if (Object.keys(clean).length === 0) return invalid();
  return guardedAction(() =>
    fetchServerApi<CommunicationSettings>("/users/me/communication", {
      method: "PUT",
      body: JSON.stringify({ categories: clean }),
    }),
  );
}

/** Reports another user's profile to the moderators. */
export async function reportUser(input: {
  userId: string;
  reason: ReportReason;
  details?: string;
}): Promise<ActionResult<{ id: string }>> {
  const details = input.details?.trim() ?? "";
  if (
    !isUuid(input?.userId) ||
    !(REPORT_REASONS as readonly string[]).includes(input.reason) ||
    details.length > 500
  ) {
    return invalid();
  }
  return guardedAction(() =>
    fetchServerApi<{ id: string }>(apiPath`/users/${input.userId}/report`, {
      method: "POST",
      body: JSON.stringify({
        reason: input.reason,
        details: details || undefined,
      }),
    }),
  );
}

/**
 * Deletes the signed-in account for good (LGPD art. 18, VI). The caller
 * signs out right after.
 */
export async function deleteOwnAccount(
  input: ReauthProof & { confirmation: string },
): Promise<ActionResult> {
  const confirmation =
    typeof input?.confirmation === "string" ? input.confirmation.trim() : "";
  if (!confirmation || confirmation.length > 64) return invalid();
  const reauth = reauthBody(input);
  if (!reauth) return invalid();
  return guardedAction(async () => {
    await fetchServerApi("/users/me", {
      method: "DELETE",
      body: JSON.stringify({ confirmation, ...reauth }),
    });
  });
}
