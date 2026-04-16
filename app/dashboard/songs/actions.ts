"use server";

import { fetchServerApi } from "@/lib/api-server";
import { revalidatePath } from "next/cache";

async function handleAction(action: () => Promise<void>) {
  try {
    await action();
    revalidatePath("/dashboard/songs");
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function createSong(data: { title: string; artist_id: string }) {
  return handleAction(() =>
    fetchServerApi("/songs", { method: "POST", body: JSON.stringify(data) }),
  );
}

export async function updateSong(
  id: string,
  data: { title?: string; artist_id?: string },
) {
  return handleAction(() =>
    fetchServerApi(`/songs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteSong(id: string) {
  return handleAction(() =>
    fetchServerApi(`/songs/${id}`, { method: "DELETE" }),
  );
}
