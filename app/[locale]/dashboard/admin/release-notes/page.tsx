import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Eye, Pencil, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { fetchServerApi } from "@/lib/api-server";
import { pickLocalized } from "@/lib/localized";
import { requireStaffPage } from "@/lib/staff-guard";
import { formatApiDate } from "@/lib/dates";
import type { ReleaseNote } from "@/types/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("releaseNotesAdmin");
  return { title: t("title") };
}

export default async function AdminReleaseNotesPage() {
  const { can } = await requireStaffPage("releaseNotes");
  const canWrite = can("releaseNotes.write");
  const t = await getTranslations("releaseNotesAdmin");
  const locale = await getLocale();
  const notes = await fetchServerApi<ReleaseNote[]>(
    "/admin/release-notes",
  ).catch(() => null);
  const sorted = notes
    ? [...notes].sort((a, b) =>
        a.released_on === b.released_on
          ? b.created_at.localeCompare(a.created_at)
          : b.released_on.localeCompare(a.released_on),
      )
    : null;

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/dashboard/admin/release-notes/new">
                <Plus aria-hidden />
                {t("new")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!canWrite && (
        <Alert>
          <Eye className="size-4" />
          <AlertDescription>{t("readOnly")}</AlertDescription>
        </Alert>
      )}

      {sorted === null ? (
        <LoadErrorNotice />
      ) : sorted.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-xl border border-dashed px-6 py-14 text-center text-sm">
          {t("empty")}
        </div>
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="divide-y p-0">
            {sorted.map((note) => (
              <Link
                key={note.id}
                href={`/dashboard/admin/release-notes/${note.id}`}
                className="hover:bg-muted/40 flex flex-col gap-2 px-5 py-4 transition-colors sm:flex-row sm:items-center sm:gap-4"
              >
                <Badge variant="secondary" className="w-fit font-mono">
                  v{note.version}
                </Badge>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">
                    {pickLocalized(note.title, locale) || t("untitled")}
                  </p>
                  <p className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
                    <span>
                      {t("releasedOn", {
                        date: formatApiDate(
                          `${note.released_on}T00:00:00`,
                          locale,
                          {
                            dateStyle: "medium",
                            timeZone: "UTC",
                          },
                        ),
                      })}
                    </span>
                    <span>{t("itemCount", { count: note.items.length })}</span>
                    {note.updated_by_username && (
                      <span>
                        {t("updatedBy", { username: note.updated_by_username })}{" "}
                        <ClientDate value={note.updated_at} />
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {note.published_at ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    >
                      {t("statusPublished")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("statusDraft")}
                    </Badge>
                  )}
                  {note.is_edited && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-700 dark:text-amber-300"
                    >
                      <Pencil aria-hidden />
                      {t("edited")}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
