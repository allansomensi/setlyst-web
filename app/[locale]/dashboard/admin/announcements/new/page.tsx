import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireStaffPage } from "@/lib/staff-guard";
import { getPlanOptions } from "@/lib/staff-data";
import { AnnouncementEditor } from "../_components/announcement-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("announcements.editor");
  return { title: t("newTitle") };
}

export default async function NewAnnouncementPage() {
  await requireStaffPage("announcements");
  const plans = await getPlanOptions();
  return <AnnouncementEditor announcement={null} plans={plans} />;
}
