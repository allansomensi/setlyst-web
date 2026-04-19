"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { CreateSongPayload, UpdateSongPayload } from "@/types/api";

export async function createSong(data: CreateSongPayload) {
  const title = data.title?.trim();
  if (!title || title.length < 1 || title.length > 255) {
    return {
      success: false,
      error: "Song title must be between 1 and 255 characters.",
    };
  }
  if (!data.artist_id) {
    return { success: false, error: "Artist is required." };
  }

  const payload: CreateSongPayload = {
    ...data,
    title,
    tempo: data.tempo ? Math.min(Math.max(Number(data.tempo), 1), 500) : null,
  };

  return guardedAction(
    () =>
      fetchServerApi("/songs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    () => revalidatePath("/dashboard/songs"),
  );
}

export async function updateSong(id: string, data: UpdateSongPayload) {
  if (!id) return { success: false, error: "Invalid song ID." };

  const payload: UpdateSongPayload = { ...data };

  if (data.title !== undefined) {
    const title = data.title?.trim();
    if (!title || title.length > 255) {
      return {
        success: false,
        error: "Song title must be between 1 and 255 characters.",
      };
    }
    payload.title = title;
  }

  if (data.tempo !== undefined && data.tempo !== null) {
    payload.tempo = Math.min(Math.max(Number(data.tempo), 1), 500);
  }

  return guardedAction(
    () =>
      fetchServerApi(`/songs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    () => revalidatePath("/dashboard/songs"),
  );
}

export async function deleteSong(id: string) {
  if (!id) return { success: false, error: "Invalid song ID." };

  return guardedAction(
    () => fetchServerApi(`/songs/${id}`, { method: "DELETE" }),
    () => revalidatePath("/dashboard/songs"),
  );
}
