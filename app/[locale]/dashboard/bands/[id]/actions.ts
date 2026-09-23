"use server";

import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  type ActionResult,
} from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import { isUuid } from "@/lib/server/api-route";
import type { PaginatedResponse } from "@/types/api";
import {
  BAND_NOTE_COLORS,
  type BandNote,
  type BandNoteColor,
  type Suggestion,
  type SuggestionFilter,
} from "@/types/content";

const FILTERS: SuggestionFilter[] = [
  "open",
  "accepted",
  "rejected",
  "withdrawn",
  "all",
];

function revalidateBand() {
  revalidateDashboard("/bands/[id]", "layout");
}

/** Suggestions change setlists too when accepted. */
function revalidateAfterResolution() {
  revalidateBand();
  revalidateDashboard("/setlists", "layout");
}

// ---------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------

export async function listSuggestions(
  bandId: string,
  status: SuggestionFilter,
  page = 1,
): Promise<ActionResult<PaginatedResponse<Suggestion>>> {
  if (!isUuid(bandId) || !FILTERS.includes(status)) return invalidRequest();
  const query = new URLSearchParams({
    status,
    page: String(Math.max(1, Math.min(page, 1000))),
    per_page: "50",
  });
  return guardedAction(() =>
    fetchServerApi<PaginatedResponse<Suggestion>>(
      `/bands/${bandId}/suggestions?${query}`,
    ),
  );
}

export async function createSuggestion(
  bandId: string,
  data: { song_id: string; setlist_id?: string; note?: string },
): Promise<ActionResult<Suggestion>> {
  if (
    !isUuid(bandId) ||
    !isUuid(data.song_id) ||
    (data.setlist_id && !isUuid(data.setlist_id))
  ) {
    return invalidRequest();
  }
  return guardedAction(
    () =>
      fetchServerApi<Suggestion>(`/bands/${bandId}/suggestions`, {
        method: "POST",
        body: JSON.stringify({
          song_id: data.song_id,
          setlist_id: data.setlist_id || undefined,
          note: data.note?.trim().slice(0, 500) || undefined,
        }),
      }),
    revalidateBand,
  );
}

/** `value` 1 or -1 votes; 0 removes the caller's vote. */
export async function voteSuggestion(
  bandId: string,
  suggestionId: string,
  value: -1 | 0 | 1,
): Promise<ActionResult<Suggestion>> {
  if (!isUuid(bandId) || !isUuid(suggestionId) || ![-1, 0, 1].includes(value)) {
    return invalidRequest();
  }
  const path = `/bands/${bandId}/suggestions/${suggestionId}/vote`;
  return guardedAction(
    () =>
      value === 0
        ? fetchServerApi<Suggestion>(path, { method: "DELETE" })
        : fetchServerApi<Suggestion>(path, {
            method: "PUT",
            body: JSON.stringify({ value }),
          }),
    // A vote can reach the auto-accept threshold.
    revalidateAfterResolution,
  );
}

export async function resolveSuggestion(
  bandId: string,
  suggestionId: string,
  action: "accept" | "reject" | "withdraw",
  note?: string,
): Promise<ActionResult<Suggestion>> {
  if (
    !isUuid(bandId) ||
    !isUuid(suggestionId) ||
    !["accept", "reject", "withdraw"].includes(action)
  ) {
    return invalidRequest();
  }
  return guardedAction(
    () =>
      fetchServerApi<Suggestion>(
        `/bands/${bandId}/suggestions/${suggestionId}/${action}`,
        {
          method: "POST",
          body:
            action === "withdraw"
              ? undefined
              : JSON.stringify({
                  note: note?.trim().slice(0, 500) || undefined,
                }),
        },
      ),
    revalidateAfterResolution,
  );
}

// ---------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------

export interface BandNoteInput {
  content: string;
  color: BandNoteColor;
  is_pinned: boolean;
  /** "YYYY-MM-DDTHH:MM" or "" for none. */
  due_at: string;
}

function noteBody(data: BandNoteInput) {
  const content = data.content.trim();
  if (!content || content.length > 2000) return null;
  if (!BAND_NOTE_COLORS.includes(data.color)) return null;
  const due = data.due_at
    ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.due_at)
      ? `${data.due_at}:00`
      : null
    : "";
  if (due === null) return null;
  return {
    content,
    color: data.color,
    is_pinned: data.is_pinned,
    due_at: due || null,
  };
}

export async function createBandNote(
  bandId: string,
  data: BandNoteInput,
): Promise<ActionResult<BandNote>> {
  const body = noteBody(data);
  if (!isUuid(bandId) || !body) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<BandNote>(`/bands/${bandId}/notes`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    revalidateBand,
  );
}

export async function updateBandNote(
  bandId: string,
  noteId: string,
  data: Partial<BandNoteInput>,
): Promise<ActionResult<BandNote>> {
  if (!isUuid(bandId) || !isUuid(noteId)) return invalidRequest();
  const body: Record<string, unknown> = {};
  if (data.content !== undefined) {
    const content = data.content.trim();
    if (!content || content.length > 2000) return invalidRequest();
    body.content = content;
  }
  if (data.color !== undefined) {
    if (!BAND_NOTE_COLORS.includes(data.color)) return invalidRequest();
    body.color = data.color;
  }
  if (data.is_pinned !== undefined) body.is_pinned = data.is_pinned;
  if (data.due_at !== undefined) {
    if (data.due_at && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.due_at)) {
      return invalidRequest();
    }
    body.due_at = data.due_at ? `${data.due_at}:00` : null;
  }
  return guardedAction(
    () =>
      fetchServerApi<BandNote>(`/bands/${bandId}/notes/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    revalidateBand,
  );
}

export async function deleteBandNote(
  bandId: string,
  noteId: string,
): Promise<ActionResult<void>> {
  if (!isUuid(bandId) || !isUuid(noteId)) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<void>(`/bands/${bandId}/notes/${noteId}`, {
        method: "DELETE",
      }),
    revalidateBand,
  );
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------

/** Up votes that accept a suggestion on their own (`null` = never). */
export async function updateSuggestionThreshold(
  bandId: string,
  votes: number | null,
): Promise<ActionResult<void>> {
  if (
    !isUuid(bandId) ||
    (votes !== null && (!Number.isInteger(votes) || votes < 1 || votes > 100))
  ) {
    return invalidRequest();
  }
  return guardedAction(
    () =>
      fetchServerApi<void>(`/bands/${bandId}`, {
        method: "PATCH",
        body: JSON.stringify({ suggestion_auto_accept_votes: votes }),
      }),
    revalidateBand,
  );
}
