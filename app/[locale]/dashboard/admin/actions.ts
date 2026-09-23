"use server";

import { revalidatePath } from "next/cache";
import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, requireStaff } from "@/lib/action-guard";
import type {
  AdminBandSummary,
  BandRole,
  PaginatedResponse,
  QuotaLimits,
  UpdateBandPayload,
  UpdateSongPayload,
  User,
} from "@/types/api";

/**
 * Staff console actions on content that belongs to other people. The API
 * enforces the split: moderators can review everything and take public
 * links down; changing or deleting someone else's data is admin-only.
 */

const enc = encodeURIComponent;

function revalidateAdmin(section: string) {
  revalidatePath(`/[locale]/dashboard/admin/${section}`, "layout");
}

// ----------------------------------------------------------------- lookups

export async function searchBands(query: string) {
  return guardedAction(async () => {
    await requireStaff();
    const q = query.trim();
    const page = await fetchServerApi<PaginatedResponse<AdminBandSummary>>(
      `/admin/bands?per_page=10${q ? `&q=${enc(q)}` : ""}`,
    );
    return page.data ?? [];
  });
}

export async function searchUsers(query: string) {
  return guardedAction(async () => {
    await requireStaff();
    const q = query.trim();
    const page = await fetchServerApi<PaginatedResponse<User>>(
      `/users?per_page=10${q ? `&q=${enc(q)}` : ""}`,
    );
    return page.data ?? [];
  });
}

// ------------------------------------------------------------------- bands

export async function updateBandAsAdmin(
  id: string,
  payload: UpdateBandPayload,
) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(`/admin/bands/${enc(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    () => revalidateAdmin("bands"),
  );
}

export async function deleteBandAsAdmin(id: string) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(`/admin/bands/${enc(id)}`, {
        method: "DELETE",
      });
    },
    () => revalidateAdmin("bands"),
  );
}

export async function addBandMemberAsAdmin(
  bandId: string,
  userId: string,
  role: Exclude<BandRole, "owner">,
) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(`/admin/bands/${enc(bandId)}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, role }),
      });
    },
    () => revalidateAdmin("bands"),
  );
}

export async function setBandMemberRoleAsAdmin(
  bandId: string,
  userId: string,
  role: Exclude<BandRole, "owner">,
) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(
        `/admin/bands/${enc(bandId)}/members/${enc(userId)}`,
        { method: "PATCH", body: JSON.stringify({ role }) },
      );
    },
    () => revalidateAdmin("bands"),
  );
}

export async function removeBandMemberAsAdmin(bandId: string, userId: string) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(
        `/admin/bands/${enc(bandId)}/members/${enc(userId)}`,
        { method: "DELETE" },
      );
    },
    () => revalidateAdmin("bands"),
  );
}

export async function transferBandOwnershipAsAdmin(
  bandId: string,
  newOwnerId: string,
) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(
        `/admin/bands/${enc(bandId)}/transfer-ownership`,
        {
          method: "POST",
          body: JSON.stringify({ new_owner_id: newOwnerId }),
        },
      );
    },
    () => revalidateAdmin("bands"),
  );
}

// ------------------------------------------------------------------- songs

export async function updateSongAsAdmin(
  id: string,
  payload: UpdateSongPayload,
) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(`/admin/songs/${enc(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    () => revalidateAdmin("songs"),
  );
}

export async function deleteSongAsAdmin(id: string) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(`/admin/songs/${enc(id)}`, {
        method: "DELETE",
      });
    },
    () => revalidateAdmin("songs"),
  );
}

// ---------------------------------------------------------------- setlists

export async function updateSetlistAsAdmin(
  id: string,
  payload: { title?: string; description?: string | null },
) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(`/admin/setlists/${enc(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    () => revalidateAdmin("setlists"),
  );
}

export async function deleteSetlistAsAdmin(id: string) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      await fetchServerApi<unknown>(`/admin/setlists/${enc(id)}`, {
        method: "DELETE",
      });
    },
    () => revalidateAdmin("setlists"),
  );
}

// ------------------------------------------------------------ public links

export async function revokeShare(
  kind: "setlist" | "gig",
  id: string,
  reason: string,
) {
  return guardedAction(
    async () => {
      await requireStaff();
      await fetchServerApi<unknown>(
        `/admin/${kind === "setlist" ? "setlists" : "gigs"}/${enc(id)}/share/revoke`,
        {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() || null }),
        },
      );
    },
    () => {
      revalidateAdmin("links");
      revalidateAdmin("setlists");
    },
  );
}

export async function unlockShare(kind: "setlist" | "gig", id: string) {
  return guardedAction(
    async () => {
      await requireStaff();
      await fetchServerApi<unknown>(
        `/admin/${kind === "setlist" ? "setlists" : "gigs"}/${enc(id)}/share/unlock`,
        { method: "POST", body: "{}" },
      );
    },
    () => {
      revalidateAdmin("links");
      revalidateAdmin("setlists");
    },
  );
}

// ------------------------------------------------------------------ limits

export async function updateQuotaDefaults(limits: QuotaLimits) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      return fetchServerApi<QuotaLimits>("/admin/settings/quotas", {
        method: "PUT",
        body: JSON.stringify(limits),
      });
    },
    () => revalidateAdmin("limits"),
  );
}
