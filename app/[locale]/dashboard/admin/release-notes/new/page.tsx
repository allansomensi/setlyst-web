import type { Metadata } from "next";
import { getTimeZone, getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { requireStaffPage } from "@/lib/staff-guard";
import type { ReleaseNote } from "@/types/public";
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

/**
 * The next minor after the highest version released so far ("0.15.2" →
 * "0.16.0"), shown as the version field's placeholder so it suggests a
 * real number instead of a fixed example. Null when there are none yet.
 */
function nextMinor(notes: ReleaseNote[] | null): string | null {
  const versions = (notes ?? [])
    .map((n) => /^(\d+)\.(\d+)\.(\d+)/.exec(n.version))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const);
  if (versions.length === 0) return null;
  const [major, minor] = versions.sort(
    (a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2],
  )[0];
  return `${major}.${minor + 1}.0`;
}

export default async function NewReleaseNotePage() {
  await requireStaffPage(
    "releaseNotes.write",
    "/dashboard/admin/release-notes",
  );
  const [timeZone, notes] = await Promise.all([
    getTimeZone(),
    fetchServerApi<ReleaseNote[]>("/admin/release-notes").catch(() => null),
  ]);
  return (
    <ReleaseNoteEditor
      note={null}
      canWrite
      today={todayIn(timeZone)}
      suggestedVersion={nextMinor(notes)}
    />
  );
}
