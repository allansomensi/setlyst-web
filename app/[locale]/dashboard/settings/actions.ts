"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import {
  UpdatePreferencesPayload,
  ImportBackupResponse,
  ImportBackupPayload,
} from "@/types/api";

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

export async function exportBackup() {
  return guardedAction(() =>
    fetchServerApi<ImportBackupPayload>("/backup/export", {
      method: "GET",
    }),
  );
}

export async function importBackup(backupData: ImportBackupPayload) {
  return guardedAction(
    () =>
      fetchServerApi<ImportBackupResponse>("/backup/import", {
        method: "POST",
        body: JSON.stringify(backupData),
      }),
    () => revalidatePath("/dashboard/settings"),
  );
}
