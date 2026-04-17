"use server";

import { fetchServerApi } from "@/lib/api-server";
import { revalidatePath } from "next/cache";
import { UpdateUserPayload } from "@/types/api";

export async function updateProfile(data: UpdateUserPayload) {
  try {
    await fetchServerApi("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return { success: false, error: message };
  }
}
