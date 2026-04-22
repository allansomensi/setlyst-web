"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { CreateSongPayload, UpdateSongPayload } from "@/types/api";
import { getTranslations } from "next-intl/server";

export async function createSong(data: CreateSongPayload) {
  const t = await getTranslations("songs.errors");
  const title = data.title?.trim();

  if (!title || title.length < 1 || title.length > 255) {
    return {
      success: false,
      error: t("titleLength"),
    };
  }
  if (!data.artist_id) {
    return { success: false, error: t("artistRequired") };
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
  const t = await getTranslations("songs.errors");

  if (!id) return { success: false, error: t("invalidId") };

  const payload: UpdateSongPayload = { ...data };

  if (data.title !== undefined) {
    const title = data.title?.trim();
    if (!title || title.length > 255) {
      return {
        success: false,
        error: t("titleLength"),
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
  const t = await getTranslations("songs.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/songs/${id}`, { method: "DELETE" }),
    () => revalidatePath("/dashboard/songs"),
  );
}
