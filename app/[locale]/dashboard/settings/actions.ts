"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { UpdatePreferencesPayload } from "@/types/api";

export async function updatePreferences(data: UpdatePreferencesPayload) {
  const safePayload: UpdatePreferencesPayload = {
    language: data.language,
    theme: data.theme,
    live_mode_font_size: data.live_mode_font_size
      ? Math.max(50, Math.min(300, data.live_mode_font_size))
      : undefined,
  };

  return guardedAction(
    () =>
      fetchServerApi("/users/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(safePayload),
      }),
    () => revalidatePath("/dashboard/settings"),
  );
}
