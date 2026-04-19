"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";

interface UpdateProfilePayload {
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export async function updateProfile(data: UpdateProfilePayload) {
  const username = data.username?.trim();
  if (!username || username.length < 1 || username.length > 128) {
    return {
      success: false,
      error: "Username must be between 1 and 128 characters.",
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
