import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTimeZone, getTranslations } from "next-intl/server";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { requireStaffPage } from "@/lib/staff-guard";
import type { ReleaseNote } from "@/types/public";
import { ReleaseNoteEditor } from "../_components/release-note-editor";
import { isUuid } from "@/lib/uuid";

type Params = Promise<{ id: string }>;

// Request-scoped: generateMetadata and the page both need it.
const load = cache(async function load(
  id: string,
): Promise<ReleaseNote | null> {
  if (!isUuid(id)) return null;
  try {
    return await fetchServerApi<ReleaseNote>(
      `/admin/release-notes/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      return null;
    }
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("releaseNotesAdmin");
  const note = await load(id).catch(() => null);
  return {
    title: note ? t("editTitle", { version: note.version }) : t("title"),
  };
}

/**
 * Today as "YYYY-MM-DD" in the viewer's zone (the `tz` cookie, via
 * next-intl), not the server's UTC: from 21:00 in Brazil the UTC date is
 * already tomorrow, which made that the default release date.
 */
function todayIn(timeZone: string | undefined): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function EditReleaseNotePage({
  params,
}: {
  params: Params;
}) {
  const { can } = await requireStaffPage("releaseNotes");
  const { id } = await params;
  const note = await load(id);
  if (!note) notFound();
  const today = todayIn(await getTimeZone());
  return (
    <ReleaseNoteEditor
      key={note.updated_at}
      note={note}
      canWrite={can("releaseNotes.write")}
      today={today}
    />
  );
}
