import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireStaffPage } from "@/lib/staff-guard";
import { ReleaseNoteEditor } from "../_components/release-note-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("releaseNotesAdmin");
  return { title: t("newTitle") };
}

export default async function NewReleaseNotePage() {
  await requireStaffPage(
    "releaseNotes.write",
    "/dashboard/admin/release-notes",
  );
  const today = new Date().toISOString().slice(0, 10);
  return <ReleaseNoteEditor note={null} canWrite today={today} />;
}
