"use server";

import { revalidatePath } from "next/cache";
import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, requireStaff } from "@/lib/action-guard";
import type {
  AdminUserOverview,
  AuditLogEntry,
  CreateUserPayload,
  PaginatedResponse,
  QuotaOverrides,
  UpdateUserPayload,
  User,
  UserQuotaSettings,
  UsernameHistoryEntry,
  UserRole,
} from "@/types/api";

/**
 * Staff actions on user accounts. Every rule (who may act on whom, the
 * password policy, the last-admin guard...) is enforced by the API; the
 * checks here only avoid a pointless round-trip and keep moderators from
 * reaching admin-only endpoints by accident.
 */

const userPath = (id: string, suffix = "") =>
  `/users/${encodeURIComponent(id)}${suffix}`;

function revalidateUser(id?: string) {
  revalidatePath("/[locale]/dashboard/users", "page");
  if (id) revalidatePath("/[locale]/dashboard/users/[id]", "page");
}

/** Trims text fields; blank optional fields are left out on create. */
function cleanCreatePayload(data: CreateUserPayload): CreateUserPayload {
  const optional = (value?: string | null) => value?.trim() || undefined;
  return {
    username: data.username.trim(),
    password: data.password,
    email: optional(data.email),
    first_name: optional(data.first_name),
    last_name: optional(data.last_name),
    role: data.role,
    status: data.status,
    require_password_change: data.require_password_change ?? true,
  };
}

export async function createUser(data: CreateUserPayload) {
  return guardedAction(
    async () => {
      await requireStaff();
      return fetchServerApi<User>("/users", {
        method: "POST",
        body: JSON.stringify(cleanCreatePayload(data)),
      });
    },
    () => revalidateUser(),
  );
}

/**
 * Staff edit. For email and names, an empty string clears the field (the
 * API stores `NULL`); `undefined` leaves it unchanged.
 */
export async function updateUser(id: string, data: UpdateUserPayload) {
  const payload: UpdateUserPayload = {
    username: data.username?.trim() || undefined,
    email: data.email === undefined ? undefined : data.email.trim(),
    first_name:
      data.first_name === undefined ? undefined : data.first_name.trim(),
    last_name: data.last_name === undefined ? undefined : data.last_name.trim(),
    role: data.role,
    status: data.status,
  };

  return guardedAction(
    async () => {
      await requireStaff();
      return fetchServerApi<User>(userPath(id), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    () => revalidateUser(id),
  );
}

export async function setUserRole(id: string, role: UserRole) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      return fetchServerApi<User>(userPath(id), {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
    },
    () => revalidateUser(id),
  );
}

export async function setUserStatus(id: string, status: User["status"]) {
  return guardedAction(
    async () => {
      await requireStaff();
      return fetchServerApi<User>(userPath(id), {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    () => revalidateUser(id),
  );
}

/** `durationHours: null` = permanent. */
export async function banUser(
  id: string,
  durationHours: number | null,
  reason: string,
) {
  return guardedAction(
    async () => {
      await requireStaff();
      return fetchServerApi<User>(userPath(id, "/ban"), {
        method: "POST",
        body: JSON.stringify({
          duration_hours: durationHours,
          reason: reason.trim() || null,
        }),
      });
    },
    () => revalidateUser(id),
  );
}

export async function unbanUser(id: string) {
  return guardedAction(
    async () => {
      await requireStaff();
      return fetchServerApi<User>(userPath(id, "/ban"), { method: "DELETE" });
    },
    () => revalidateUser(id),
  );
}

/**
 * Sets a password chosen by staff. By default it's temporary: the person
 * must replace it at their next sign-in. Either way every session of that
 * account is signed out.
 */
export async function resetUserPassword(
  id: string,
  newPassword: string,
  requireChange = true,
) {
  return guardedAction(
    async () => {
      await requireStaff();
      await fetchServerApi<unknown>(userPath(id, "/password-reset"), {
        method: "POST",
        body: JSON.stringify({
          new_password: newPassword,
          require_change: requireChange,
        }),
      });
    },
    () => revalidateUser(id),
  );
}

export async function revokeUserSessions(id: string) {
  return guardedAction(async () => {
    await requireStaff();
    await fetchServerApi<unknown>(userPath(id, "/sessions/revoke"), {
      method: "POST",
      body: "{}",
    });
  });
}

export async function updateUserQuotas(
  id: string,
  overrides: QuotaOverrides,
  unlimited: boolean,
) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      return fetchServerApi<UserQuotaSettings>(userPath(id, "/quotas"), {
        method: "PUT",
        body: JSON.stringify({ overrides, unlimited }),
      });
    },
    () => revalidateUser(id),
  );
}

export async function addUserToBand(
  userId: string,
  bandId: string,
  role: "member" | "moderator" | "admin",
) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(
        `/admin/bands/${encodeURIComponent(bandId)}/members`,
        {
          method: "POST",
          body: JSON.stringify({ user_id: userId, role }),
        },
      );
    },
    () => {
      revalidateUser(userId);
      revalidatePath("/[locale]/dashboard/admin/bands", "layout");
    },
  );
}

export async function deleteUser(id: string) {
  return guardedAction(
    async () => {
      await requireStaff();
      await fetchServerApi<unknown>(userPath(id), { method: "DELETE" });
    },
    () => revalidateUser(),
  );
}

export async function getUserOverview(id: string) {
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<AdminUserOverview>(userPath(id, "/overview"));
  });
}

export async function getUsernameHistory(
  userId: string,
): Promise<UsernameHistoryEntry[]> {
  try {
    return await fetchServerApi<UsernameHistoryEntry[]>(
      userPath(userId, "/username-history"),
    );
  } catch (error) {
    console.error("Failed to fetch username history", error);
    return [];
  }
}

export async function getUserAuditTrail(
  userId: string,
): Promise<AuditLogEntry[]> {
  try {
    const page = await fetchServerApi<PaginatedResponse<AuditLogEntry>>(
      `/admin/audit-logs?target_id=${encodeURIComponent(userId)}&per_page=20`,
    );
    return page.data ?? [];
  } catch (error) {
    console.error("Failed to fetch audit trail", error);
    return [];
  }
}
