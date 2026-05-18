"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

interface UpdateProfilePayload {
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export async function updateProfile(data: UpdateProfilePayload) {
  const t = await getTranslations("profile.errors");
  const username = data.username?.trim();

  if (!username || username.length < 1 || username.length > 128) {
    return {
      success: false,
      error: t("usernameLength"),
    };
  }

  const safePayload: UpdateProfilePayload = {
    username,
    email: data.email?.trim() || null,
    first_name: data.first_name?.trim() || null,
    last_name: data.last_name?.trim() || null,
  };

  return guardedAction(
    () =>
      fetchServerApi("/users/me", {
        method: "PATCH",
        body: JSON.stringify(safePayload),
      }),
    () => revalidatePath("/dashboard"),
  );
}

export async function changePassword(formData: FormData) {
  const t = await getTranslations("profile.errors");

  const current_password = formData.get("current_password") as string;
  const new_password = formData.get("new_password") as string;

  if (!current_password || !new_password) {
    return {
      success: false,
      error: t("missingFields") || "Missing required fields",
    };
  }

  if (new_password.length < 8) {
    return {
      success: false,
      error: t("passwordTooShort") || "Password must be at least 8 characters",
    };
  }

  return guardedAction(
    () =>
      fetchServerApi("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ current_password, new_password }),
      }),
    () => revalidatePath("/dashboard/profile"),
  );
}
