"use server";

import { fetchServerApi } from "@/lib/api-server";
import { revalidatePath } from "next/cache";

async function handleAction(action: () => Promise<void>) {
  try {
    await action();
    revalidatePath("/dashboard/artists");
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function createArtist(data: { name: string }) {
  return handleAction(() =>
    fetchServerApi("/artists", { method: "POST", body: JSON.stringify(data) }),
  );
}

export async function updateArtist(id: string, data: { name: string }) {
  return handleAction(() =>
    fetchServerApi(`/artists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteArtist(id: string) {
  return handleAction(() =>
    fetchServerApi(`/artists/${id}`, { method: "DELETE" }),
  );
}
