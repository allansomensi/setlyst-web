"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { getTranslations } from "next-intl/server";

/**
 * Changes the signed-in user's password. On success the API revokes every
 * session — including this one — so the caller must sign out and send the
 * person to the login page.
 */
export async function changeOwnPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const t = await getTranslations("apiErrors");

  if (!input.currentPassword || !input.newPassword) {
    return { success: false as const, error: t("generic") };
  }

  return guardedAction(() =>
    fetchServerApi<{ reauth_required: boolean }>("/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({
        current_password: input.currentPassword,
        new_password: input.newPassword,
      }),
    }),
  );
}
