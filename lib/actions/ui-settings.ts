"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { normalizeUiSettings, type UiSettingsPatch } from "@/lib/ui-settings";
import type { UserPreferences } from "@/types/api";

/**
 * Persists the given UI settings sections on the account. Each section is
 * normalized first, so a stale or malformed client value can never be
 * stored.
 */
export async function saveUiSettings(patch: UiSettingsPatch) {
  const normalized = normalizeUiSettings(patch);
  const body: Record<string, unknown> = {};
  for (const key of Object.keys(patch) as (keyof UiSettingsPatch)[]) {
    body[key] = normalized[key];
  }

  return guardedAction(() =>
    fetchServerApi<UserPreferences>("/users/me/preferences", {
      method: "PATCH",
      body: JSON.stringify({ ui_settings: body }),
    }),
  );
}
