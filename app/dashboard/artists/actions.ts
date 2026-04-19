"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";

export async function createArtist(data: { name: string }) {
  const name = data.name?.trim();
  if (!name || name.length < 1 || name.length > 255) {
    return {
      success: false,
      error: "Artist name must be between 1 and 255 characters.",
    };
  }

  return guardedAction(
    () =>
      fetchServerApi("/artists", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    () => revalidatePath("/dashboard/artists"),
  );
}

export async function updateArtist(id: string, data: { name: string }) {
  if (!id) return { success: false, error: "Invalid artist ID." };

  const name = data.name?.trim();
  if (!name || name.length < 1 || name.length > 255) {
    return {
      success: false,
      error: "Artist name must be between 1 and 255 characters.",
    };
  }

  return guardedAction(
    () =>
      fetchServerApi(`/artists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    () => revalidatePath("/dashboard/artists"),
  );
}

export async function deleteArtist(id: string) {
  if (!id) return { success: false, error: "Invalid artist ID." };

  return guardedAction(
    () => fetchServerApi(`/artists/${id}`, { method: "DELETE" }),
    () => revalidatePath("/dashboard/artists"),
  );
}
