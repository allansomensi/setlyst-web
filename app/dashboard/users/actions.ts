"use server";

import { fetchServerApi } from "@/lib/api-server";
import { revalidatePath } from "next/cache";
import { UpdateUserPayload } from "@/types/api";

async function handleAction(action: () => Promise<void>) {
  try {
    await action();
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function updateUser(id: string, data: UpdateUserPayload) {
  return handleAction(() =>
    fetchServerApi(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );
}
