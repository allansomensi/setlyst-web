"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import { getTranslations } from "next-intl/server";
import type { User, UsernameAvailability } from "@/types/api";
import {
  AVATAR_URL_MAX,
  BIO_MAX,
  INSTRUMENT_MAX,
  INSTRUMENTS_MAX,
  LOCATION_MAX,
  isAcceptableAvatarUrl,
  normalizeInstruments,
} from "@/lib/profile";

interface UpdateProfileInput {
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  location: string;
  instruments: string[];
}

/**
 * Saves the public profile. Empty strings clear optional fields (the
 * API's convention). The e-mail address has its own verified flow.
 */
export async function updateProfile(data: UpdateProfileInput) {
  const t = await getTranslations("profile.errors");
  const username = data.username?.trim();

  if (!username || username.length > 128) {
    return { success: false as const, error: t("usernameLength") };
  }

  const bio = (data.bio ?? "").trim();
  const location = (data.location ?? "").trim();
  const instruments = normalizeInstruments(data.instruments ?? []);
  if (
    bio.length > BIO_MAX ||
    location.length > LOCATION_MAX ||
    instruments.length > INSTRUMENTS_MAX ||
    instruments.some((item) => item.length > INSTRUMENT_MAX)
  ) {
    return { success: false as const, error: t("invalid") };
  }

  return guardedAction(
    () =>
      fetchServerApi<User>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          username,
          first_name: (data.first_name ?? "").trim().slice(0, 50),
          last_name: (data.last_name ?? "").trim().slice(0, 50),
          bio,
          location,
          instruments,
        }),
      }),
    () => revalidateDashboard("", "layout"),
  );
}

/** Sets (an `https` image URL) or removes (`null`) the avatar. */
export async function updateAvatar(url: string | null) {
  const t = await getTranslations("apiErrors");
  const value = url?.trim() ?? "";
  if (
    value &&
    (value.length > AVATAR_URL_MAX || !isAcceptableAvatarUrl(value))
  ) {
    return { success: false as const, error: t("INVALID_IMAGE_URL") };
  }
  return guardedAction(
    () =>
      fetchServerApi<User>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url: value }),
      }),
    () => revalidateDashboard("", "layout"),
  );
}

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean } | null> {
  if (!username || username.length < 3) return null;

  try {
    const result = await fetchServerApi<UsernameAvailability>(
      `/users/me/username-availability?username=${encodeURIComponent(username)}`,
    );
    return { available: result.available };
  } catch (error) {
    console.error("Failed to check username availability", error);
    return null;
  }
}
