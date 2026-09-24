import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReleaseNotesList } from "@/components/release-notes/release-notes-list";
import { WIKI_URL } from "@/lib/links";
import { fetchPublicApi } from "@/lib/public-api";
import { latestReleaseId } from "@/lib/release-note-editor";
import type { ReleaseNote } from "@/types/public";
import { MarkReleasesSeen } from "./_components/mark-releases-seen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("whatsNew");
  return { title: t("title") };
}

export default async function WhatsNewPage() {
  const t = await getTranslations("whatsNew");
  const locale = await getLocale();
  // Shared by every visitor for a minute: the same list for everyone, and
  // a note published a moment ago still shows up quickly.
  const result = await fetchPublicApi<ReleaseNote[]>("/public/release-notes", {
    revalidate: 60,
  });
  const notes = result.ok && Array.isArray(result.data) ? result.data : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <MarkReleasesSeen latestId={notes ? latestReleaseId(notes) : null} />
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t.rich("description", {
            wiki: (chunks) => (
              <a
                href={WIKI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>

      {notes === null ? (
        <Alert>
          <AlertDescription>{t("unavailable")}</AlertDescription>
        </Alert>
      ) : (
        <ReleaseNotesList notes={notes} locale={locale} />
      )}
    </div>
  );
}
