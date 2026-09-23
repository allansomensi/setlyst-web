"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { UsernameAvailability } from "@/types/api";

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

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean } | null> {
  if (!username || username.length < 3) return null;

  try {
    const result = await fetchServerApi<UsernameAvailability>(
      `/users/me/username-availability?username=${encodeURIComponent(username)}`,
    );
    return { available: result.available };
  } catch (error) {
    console.error("Failed to check username availability", error);
    return null;
  }
}
