"use server";

import { fetchServerApi } from "@/lib/api-server";
import { requireSession, toActionFailure } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import {
  CreateUserPayload,
  UpdateUserPayload,
  UsernameHistoryEntry,
} from "@/types/api";
import { getTranslations } from "next-intl/server";

export async function createUser(data: CreateUserPayload) {
  const t = await getTranslations("users.errors");
  const session = await requireSession().catch(() => null);

  if (!session) return { success: false, error: t("unauthorized") };

  const { role } = session.user;
  if (role !== "admin" && role !== "moderator") {
    return { success: false, error: t("forbidden") };
  }

  if (role === "moderator" && data.role === "admin") {
    return { success: false, error: t("forbiddenAdmin") };
  }

  const username = data.username?.trim();
  if (!username || username.length < 3 || username.length > 20) {
    return { success: false, error: t("usernameLength") };
  }

  if (
    !data.password ||
    data.password.length < 8 ||
    data.password.length > 100
  ) {
    return { success: false, error: t("passwordLength") };
  }

  try {
    await fetchServerApi("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return toActionFailure(error, t("createFailed"));
  }
}

export async function updateUser(id: string, data: UpdateUserPayload) {
  const t = await getTranslations("users.errors");
  if (!id) return { success: false, error: t("invalidId") };

  const session = await requireSession().catch(() => null);
  if (!session) return { success: false, error: t("unauthorized") };

  const { role } = session.user;
  if (role !== "admin" && role !== "moderator") {
    return { success: false, error: t("forbidden") };
  }

  if (role === "moderator" && data.role === "admin") {
    return { success: false, error: t("forbiddenAdmin") };
  }

  const username = data.username?.trim();
  if (username && (username.length < 3 || username.length > 20)) {
    return { success: false, error: t("usernameLength") };
  }

  const safePayload: UpdateUserPayload = {
    username: username || undefined,
    email: data.email?.trim() || null,
    first_name: data.first_name?.trim() || null,
    last_name: data.last_name?.trim() || null,
    role: data.role,
    status: data.status,
  };

  try {
    await fetchServerApi(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(safePayload),
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return toActionFailure(error, t("updateFailed"));
  }
}

export async function deleteUser(id: string) {
  const t = await getTranslations("users.errors");
  if (!id) return { success: false, error: t("invalidId") };

  const session = await requireSession().catch(() => null);
  if (!session) return { success: false, error: t("unauthorized") };

  const { role } = session.user;
  if (role !== "admin" && role !== "moderator") {
    return { success: false, error: t("forbidden") };
  }

  try {
    await fetchServerApi(`/users/${id}`, { method: "DELETE" });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return toActionFailure(error, t("deleteFailed"));
  }
}

export async function changeUserPassword(id: string, password: string) {
  const t = await getTranslations("users.errors");
  if (!id) return { success: false, error: t("invalidId") };

  const session = await requireSession().catch(() => null);
  if (!session) return { success: false, error: t("unauthorized") };

  const { role } = session.user;
  if (role !== "admin" && role !== "moderator") {
    return { success: false, error: t("forbidden") };
  }

  if (!password || password.length < 8 || password.length > 100) {
    return { success: false, error: t("passwordLength") };
  }

  try {
    await fetchServerApi(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ password }),
    });
    return { success: true };
  } catch (error) {
    return toActionFailure(error, t("passwordFailed"));
  }
}

export async function getUsernameHistory(
  userId: string,
): Promise<UsernameHistoryEntry[]> {
  try {
    return await fetchServerApi<UsernameHistoryEntry[]>(
      `/users/${userId}/username-history`,
    );
  } catch (error) {
    console.error("Failed to fetch username history", error);
    return [];
  }
}
