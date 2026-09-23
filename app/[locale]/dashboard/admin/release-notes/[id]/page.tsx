import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { requireStaffPage } from "@/lib/staff-guard";
import type { ReleaseNote } from "@/types/public";
import { ReleaseNoteEditor } from "../_components/release-note-editor";
import { isUuid } from "@/lib/uuid";

type Params = Promise<{ id: string }>;

async function load(id: string): Promise<ReleaseNote | null> {
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
}

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

export default async function EditReleaseNotePage({
  params,
}: {
  params: Params;
}) {
  const { can } = await requireStaffPage("releaseNotes");
  const { id } = await params;
  const note = await load(id);
  if (!note) notFound();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ReleaseNoteEditor
      key={note.updated_at}
      note={note}
      canWrite={can("releaseNotes.write")}
      today={today}
    />
  );
}
