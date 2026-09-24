"use server";

import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  type ActionResult,
} from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import { PIN_ITEM_TYPES, type PinItemType } from "@/types/content";
import { isUuid } from "@/lib/uuid";

/** Where each kind of item shows its pin state. */
const PIN_VIEWS: Record<PinItemType, string[]> = {
  setlist: ["/setlists", "/setlists/[id]", "/bands/[id]/setlists"],
  band: ["/bands", "/bands/[id]"],
  song: ["/songs", "/songs/[id]"],
  tour: ["/tours", "/tours/[id]", "/bands/[id]"],
  gig: ["/gigs", "/gigs/[id]", "/bands/[id]/gigs", "/tours/[id]"],
};

function revalidatePins(type: PinItemType) {
  revalidateDashboard("");
  for (const path of PIN_VIEWS[type]) revalidateDashboard(path);
}

function isValidItem(type: unknown, id: unknown): boolean {
  return (
    typeof type === "string" &&
    (PIN_ITEM_TYPES as readonly string[]).includes(type) &&
    isUuid(id)
  );
}

/** Pins an item to the home page (idempotent; at most 12). */
export async function pinItem(
  type: PinItemType,
  id: string,
): Promise<ActionResult<void>> {
  if (!isValidItem(type, id)) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<void>("/users/me/pins", {
        method: "PUT",
        body: JSON.stringify({ item_type: type, item_id: id }),
      }),
    () => revalidatePins(type),
  );
}

export async function unpinItem(
  type: PinItemType,
  id: string,
): Promise<ActionResult<void>> {
  if (!isValidItem(type, id)) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<void>(`/users/me/pins/${type}/${id}`, {
        method: "DELETE",
      }),
    () => revalidatePins(type),
  );
}

/** Saves the order of the home page's pinned items. */
export async function reorderPins(
  items: Array<{ item_type: PinItemType; item_id: string }>,
): Promise<ActionResult<void>> {
  // Client input: checked for shape before anything reads it.
  if (
    !Array.isArray(items) ||
    items.length > 12 ||
    items.some(
      (i) =>
        !i || typeof i !== "object" || !isValidItem(i.item_type, i.item_id),
    )
  ) {
    return invalidRequest();
  }
  const clean = items.map(({ item_type, item_id }) => ({ item_type, item_id }));
  return guardedAction(
    () =>
      fetchServerApi<void>("/users/me/pins/order", {
        method: "PUT",
        body: JSON.stringify({ items: clean }),
      }),
    () => revalidateDashboard(""),
  );
}
