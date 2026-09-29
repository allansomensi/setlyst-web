import type { Metadata } from "next";
import { getTimeZone, getTranslations } from "next-intl/server";
import { requireStaffPage } from "@/lib/staff-guard";
import { ReleaseNoteEditor } from "../_components/release-note-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("releaseNotesAdmin");
  return { title: t("newTitle") };
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

export default async function NewReleaseNotePage() {
  await requireStaffPage(
    "releaseNotes.write",
    "/dashboard/admin/release-notes",
  );
  const today = todayIn(await getTimeZone());
  return <ReleaseNoteEditor note={null} canWrite today={today} />;
}
