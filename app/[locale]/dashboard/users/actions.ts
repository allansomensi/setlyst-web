"use server";

import { revalidateDashboard } from "@/lib/revalidate";
import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  requireStaff,
} from "@/lib/action-guard";
import { apiPath } from "@/lib/api-endpoint";
import { isUuid } from "@/lib/uuid";
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

/** Callers check `isUuid(id)` first; `apiPath` keeps it one segment anyway. */
const userPath = (id: string, suffix = "") =>
  `${apiPath`/users/${id}`}${suffix}`;

function revalidateUser(id?: string) {
  revalidateDashboard("/users", "page");
  if (id) revalidateDashboard("/users/[id]", "page");
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

/** Text fields of a staff edit: a string, or absent. */
const UPDATE_TEXT_FIELDS = [
  "username",
  "email",
  "first_name",
  "last_name",
] as const satisfies readonly (keyof UpdateUserPayload)[];

/**
 * Staff edit. For email and names, an empty string clears the field (the
 * API stores `NULL`); `undefined` leaves it unchanged.
 */
export async function updateUser(id: string, data: UpdateUserPayload) {
  if (
    !isUuid(id) ||
    !data ||
    typeof data !== "object" ||
    UPDATE_TEXT_FIELDS.some(
      (key) => data[key] !== undefined && typeof data[key] !== "string",
    )
  ) {
    return invalidRequest();
  }
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
  if (!isUuid(id)) return invalidRequest();
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
  if (!isUuid(id)) return invalidRequest();
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
  if (!isUuid(id)) return invalidRequest();
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
  if (!isUuid(id)) return invalidRequest();
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
  if (!isUuid(id)) return invalidRequest();
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
  if (!isUuid(id)) return invalidRequest();
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
  if (!isUuid(id)) return invalidRequest();
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
  if (!isUuid(userId) || !isUuid(bandId)) return invalidRequest();
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(apiPath`/admin/bands/${bandId}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, role }),
      });
    },
    () => {
      revalidateUser(userId);
      revalidateDashboard("/admin/bands", "layout");
    },
  );
}

export async function deleteUser(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(
    async () => {
      await requireStaff();
      await fetchServerApi<unknown>(userPath(id), { method: "DELETE" });
    },
    () => revalidateUser(),
  );
}

export async function getUserOverview(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<AdminUserOverview>(userPath(id, "/overview"));
  });
}

export async function getUsernameHistory(
  userId: string,
): Promise<UsernameHistoryEntry[]> {
  if (!isUuid(userId)) return [];
  try {
    await requireStaff();
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
  if (!isUuid(userId)) return [];
  try {
    await requireStaff();
    const page = await fetchServerApi<PaginatedResponse<AuditLogEntry>>(
      `/admin/audit-logs?target_id=${encodeURIComponent(userId)}&per_page=20`,
    );
    return page.data ?? [];
  } catch (error) {
    console.error("Failed to fetch audit trail", error);
    return [];
  }
}
