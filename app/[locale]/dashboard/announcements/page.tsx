import type { Metadata } from "next";
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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground">{t("pageDescription")}</p>
      </div>
      {result === null ? (
        <LoadErrorNotice />
      ) : (
        <AnnouncementsHistory announcements={result} />
      )}
    </div>
  );
}
