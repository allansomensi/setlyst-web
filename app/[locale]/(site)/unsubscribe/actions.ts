"use server";

import { fetchPublicApi } from "@/lib/public-api";
import { isPlausibleUnsubscribeToken } from "@/lib/unsubscribe";
import {
  COMMUNICATION_CATEGORIES,
  type CommunicationCategory,
  type UnsubscribeInfo,
} from "@/types/public";

export type UnsubscribeState =
  | { status: "idle" }
  | { status: "success"; category: CommunicationCategory | null }
  | { status: "invalid" }
  | { status: "error" };

/**
 * Confirms an unsubscribe link (`POST /public/email/unsubscribe`). Needs
 * no session: the signed token is the authorization.
 */
export async function confirmUnsubscribe(
  _previous: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const token = formData.get("token");
  if (!isPlausibleUnsubscribeToken(token)) return { status: "invalid" };

  const result = await fetchPublicApi<UnsubscribeInfo>(
    "/public/email/unsubscribe",
    { method: "POST", body: { token }, forwardClientIp: true },
  );

  if (result.ok) {
    const category = result.data.category;
    return {
      status: "success",
      category:
        category && COMMUNICATION_CATEGORIES.includes(category)
          ? category
          : null,
    };
  }
  return result.status === 400 || result.status === 422
    ? { status: "invalid" }
    : { status: "error" };
}
