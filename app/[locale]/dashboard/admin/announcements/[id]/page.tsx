import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { requireStaffPage } from "@/lib/staff-guard";
import { getPlanOptions } from "@/lib/staff-data";
import type { AdminAnnouncement } from "@/types/communication";
import { AnnouncementEditor } from "../_components/announcement-editor";
import { isUuid } from "@/lib/uuid";

type Params = Promise<{ id: string }>;

async function load(id: string): Promise<AdminAnnouncement | null> {
  if (!isUuid(id)) return null;
  try {
    return await fetchServerApi<AdminAnnouncement>(
      `/admin/announcements/${encodeURIComponent(id)}`,
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
  const t = await getTranslations("announcements.editor");
  const announcement = await load(id).catch(() => null);
  return { title: announcement?.title ?? t("editTitle") };
}

export default async function EditAnnouncementPage({
  params,
}: {
  params: Params;
}) {
  await requireStaffPage("announcements");
  const { id } = await params;
  const [announcement, plans] = await Promise.all([load(id), getPlanOptions()]);
  if (!announcement) notFound();
  return (
    <AnnouncementEditor
      key={announcement.updated_at}
      announcement={announcement}
      plans={plans}
    />
  );
}
