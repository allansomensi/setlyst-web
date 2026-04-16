"use server";

import { fetchServerApi } from "@/lib/api-server";
import { revalidatePath } from "next/cache";

async function handleAction(action: () => Promise<void>) {
  try {
    await action();
    revalidatePath("/dashboard/setlists");
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function createSetlist(data: {
  title: string;
  description?: string;
}) {
  return handleAction(() =>
    fetchServerApi("/setlists", { method: "POST", body: JSON.stringify(data) }),
  );
}

export async function updateSetlist(
  id: string,
  data: { title?: string; description?: string },
) {
  return handleAction(() =>
    fetchServerApi(`/setlists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteSetlist(id: string) {
  return handleAction(() =>
    fetchServerApi(`/setlists/${id}`, { method: "DELETE" }),
  );
}

export async function addSongToSetlist(
  setlistId: string,
  data: { song_id: string; position: number },
) {
  try {
    await fetchServerApi(`/setlists/${setlistId}/songs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    revalidatePath(`/dashboard/setlists/${setlistId}`);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function removeSongFromSetlist(setlistId: string, songId: string) {
  try {
    await fetchServerApi(`/setlists/${setlistId}/songs/${songId}`, {
      method: "DELETE",
    });
    revalidatePath(`/dashboard/setlists/${setlistId}`);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}
