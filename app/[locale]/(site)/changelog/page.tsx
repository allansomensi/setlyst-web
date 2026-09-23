import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CloudOff } from "lucide-react";
import { ReleaseNotesList } from "@/components/release-notes/release-notes-list";
import { PageIntro } from "@/components/site/page-intro";
import { getPublicReleaseNotes } from "@/lib/public-api";
import { publicPageMetadata } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return publicPageMetadata({
    locale,
    path: "/changelog",
    title: t("changelogTitle"),
    description: t("changelogDescription"),
  });
}

export default async function ChangelogPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations("releaseNotes");
  const notes = await getPublicReleaseNotes();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <PageIntro
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="mt-12">
        {notes === null ? (
          <div
            role="status"
            className="bg-card text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center"
          >
            <CloudOff className="size-8 opacity-60" />
            <p>{t("unavailable")}</p>
          </div>
        ) : (
          <ReleaseNotesList notes={notes} locale={locale} />
        )}
      </div>
    </div>
  );
}
