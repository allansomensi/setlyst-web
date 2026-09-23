"use server";

import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  type ActionResult,
} from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import { TRASH_TYPES, type TrashType } from "@/types/content";
import { isUuid } from "@/lib/uuid";

function isValid(type: string, id: string) {
  return (TRASH_TYPES as readonly string[]).includes(type) && isUuid(id);
}

/**
 * Restoring or deleting touches every list the item appears in (songs in
 * setlists, gigs in tours, the home page pins...): refresh the whole
 * dashboard.
 */
function revalidateAll() {
  revalidateDashboard("", "layout");
}

/** Puts an item (and what was trashed with it) back. Also "Desfazer". */
export async function restoreTrashItem(
  type: TrashType,
  id: string,
): Promise<ActionResult<void>> {
  if (!isValid(type, id)) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<void>(`/trash/${type}/${id}/restore`, { method: "POST" }),
    revalidateAll,
  );
}

/** Deletes one trashed item for good. */
export async function deleteTrashItem(
  type: TrashType,
  id: string,
): Promise<ActionResult<void>> {
  if (!isValid(type, id)) return invalidRequest();
  return guardedAction(
    () => fetchServerApi<void>(`/trash/${type}/${id}`, { method: "DELETE" }),
    () => revalidateDashboard("/trash"),
  );
}

/** Empties the personal trash, or a band's (`bandId`). */
export async function emptyTrash(
  bandId?: string,
): Promise<ActionResult<{ deleted: number }>> {
  if (bandId && !isUuid(bandId)) {
    return invalidRequest();
  }
  const query = bandId ? `scope=band&band_id=${bandId}` : "scope=personal";
  return guardedAction(
    () =>
      fetchServerApi<{ deleted: number }>(`/trash?${query}`, {
        method: "DELETE",
      }),
    () => revalidateDashboard("/trash"),
  );
}
