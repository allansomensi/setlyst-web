import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getTranslations } from "next-intl/server";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { fetchAllServerPages } from "@/lib/api-server";
import type { UserAnnouncement } from "@/types/communication";
import { AnnouncementsHistory } from "./_components/announcements-history";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("announcements");
  return { title: t("pageTitle") };
}

export default async function AnnouncementsPage() {
  const t = await getTranslations("announcements");
  const result = await fetchAllServerPages<UserAnnouncement>("/announcements")
    .then((page) => page.data ?? [])
    .catch(() => null);

  return (
    // Lined up with every other page; the list keeps its reading width.
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10 *:max-w-3xl">
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />
      {result === null ? (
        <LoadErrorNotice />
      ) : (
        <AnnouncementsHistory announcements={result} />
      )}
    </div>
  );
}
