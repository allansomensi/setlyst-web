"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { normalizeFontSize } from "@/lib/preferences";
import { routing } from "@/i18n/routing";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  UpdatePreferencesPayload,
  ImportBackupResponse,
  ImportBackupPayload,
} from "@/types/api";

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isSupportedLocale(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (routing.locales as readonly string[]).includes(value)
  );
}

export async function updatePreferences(data: UpdatePreferencesPayload) {
  const safePayload: UpdatePreferencesPayload = {
    language: data.language,
    theme: data.theme,
    live_mode_font_size:
      data.live_mode_font_size === undefined
        ? undefined
        : normalizeFontSize(data.live_mode_font_size),
  };

  const result = await guardedAction(
    () =>
      fetchServerApi("/users/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(safePayload),
      }),
    () => revalidatePath("/dashboard/settings"),
  );

  // Record the choice where every later request can see it — including the
  // ones that arrive with no locale in the URL at all, such as an
  // installed PWA launching at its `start_url`. Writing this only when the
  // *selected* language differed from the previously loaded one (which is
  // what the client-side locale switch effectively did) left the cookie
  // unset for anyone who never changed the setting after it was first
  // saved, so those launches fell back to the browser's language instead.
  // See `resolvePreferredLocale` in proxy.ts for the read side.
  if (result.success && isSupportedLocale(safePayload.language)) {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, safePayload.language, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return result;
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
