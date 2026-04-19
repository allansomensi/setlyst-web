"use server";

import { fetchServerApi } from "@/lib/api-server";
import { requireSession } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { UpdateUserPayload } from "@/types/api";

export async function updateUser(id: string, data: UpdateUserPayload) {
  if (!id) return { success: false, error: "Invalid user ID." };

  const session = await requireSession().catch(() => null);
  if (!session) return { success: false, error: "Unauthorized." };

  const { role } = session.user;
  if (role !== "admin" && role !== "moderator") {
    return { success: false, error: "Forbidden. Insufficient permissions." };
  }

  // Moderators cannot elevate to admin
  if (role === "moderator" && data.role === "admin") {
    return { success: false, error: "Forbidden. Cannot assign admin role." };
  }

  const username = data.username?.trim();
  if (!username || username.length < 1 || username.length > 128) {
    return {
      success: false,
      error: "Username must be between 1 and 128 characters.",
    };
  }

  const safePayload: UpdateUserPayload = {
    username,
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
    const message =
      error instanceof Error ? error.message : "Failed to update user.";
    return { success: false, error: message };
  }
}
