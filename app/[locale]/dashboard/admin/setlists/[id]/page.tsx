import { AuditStamp } from "@/components/audit-stamp";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { Coffee, Layers } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import {
  ShareModerationButton,
  ShareStatusBadge,
} from "@/components/staff/share-moderation";
import { Link } from "@/i18n/routing";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { authOptions } from "@/lib/auth";
import { formatApiDateTime } from "@/lib/dates";
import { formatDuration } from "@/lib/utils";
import type { AdminSetlistDetail } from "@/types/api";
import { SetlistAdminActions } from "./_components/setlist-admin-actions";

type Params = Promise<{ id: string }>;

async function loadSetlist(id: string): Promise<AdminSetlistDetail | null> {
  try {
    return await fetchServerApi<AdminSetlistDetail>(
      `/admin/setlists/${encodeURIComponent(id)}`,
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
  const t = await getTranslations("metadata");
  const detail = await loadSetlist(id).catch(() => null);
  return { title: detail?.setlist.title ?? t("adminSetlists") };
}

export default async function AdminSetlistPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await loadSetlist(id);
  if (!detail) notFound();

  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "admin";
  const t = await getTranslations("staff.setlistDetail");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
  const timeZone = await getTimeZone();
  const { setlist, items } = detail;
  // Song numbers skip blocks and breaks, like the setlist itself.
  const songNumbers = items.reduce<number[]>((acc, item, index) => {
    const previous = index > 0 ? acc[index - 1] : 0;
    acc.push(item.item_type === "song" ? previous + 1 : previous);
    return acc;
  }, []);

  return (
    <>
      <PageBreadcrumbs
        items={[
          { label: tNav("adminSetlists"), href: "/dashboard/admin/setlists" },
          { label: setlist.title },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {setlist.title}
          </h1>
          {setlist.description && (
            <p className="text-muted-foreground whitespace-pre-line">
              {setlist.description}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            <Link
              href={`/dashboard/users/${setlist.user_id}`}
              className="text-foreground hover:underline"
            >
              @{setlist.owner_username ?? "—"}
            </Link>
            {setlist.band_id && (
              <>
                {" · "}
                <Link
                  href={`/dashboard/admin/bands/${setlist.band_id}`}
                  className="text-foreground hover:underline"
                >
                  {setlist.band_name}
                </Link>
              </>
            )}
            {" · "}
            {t("summary", {
              songs: setlist.song_count,
              duration: formatDuration(setlist.total_duration) || "0:00",
            })}
          </p>
          <AuditStamp
            updatedAt={setlist.updated_at}
            updatedBy={setlist.updated_by_username}
          />
        </div>
        {isAdmin && <SetlistAdminActions setlist={setlist} />}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {t("publicLink")} <ShareStatusBadge state={setlist} />
            </CardTitle>
            <CardDescription>
              {setlist.share_locked_at
                ? t("lockedDescription", {
                    date: formatApiDateTime(
                      setlist.share_locked_at,
                      locale,
                      timeZone,
                    ),
                  })
                : setlist.share_token
                  ? t("publicDescription")
                  : t("privateDescription")}
            </CardDescription>
          </div>
          <ShareModerationButton state={{ kind: "setlist", ...setlist }} />
        </CardHeader>
        {setlist.share_locked_at && setlist.share_lock_reason && (
          <CardContent>
            <Alert>
              <AlertTitle>{t("lockReason")}</AlertTitle>
              <AlertDescription>{setlist.share_lock_reason}</AlertDescription>
            </Alert>
          </CardContent>
        )}
        {setlist.share_token && !setlist.share_locked_at && (
          <CardContent>
            {/* Public pages live outside the locale segment. */}
            <a
              href={`/s/${setlist.share_token}`}
              className="text-primary text-sm break-all hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              /s/{setlist.share_token}
            </a>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("runningOrder")}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <ol className="divide-y">
              {items.map((item, index) => {
                if (item.item_type === "block") {
                  return (
                    <li
                      key={`block-${item.id}`}
                      className="text-muted-foreground flex items-center gap-2 pt-4 pb-2 text-xs font-semibold tracking-wide uppercase"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {item.name}
                    </li>
                  );
                }
                if (item.item_type === "break") {
                  return (
                    <li
                      key={`break-${item.id}`}
                      className="text-muted-foreground flex items-center gap-2 py-2 text-sm italic"
                    >
                      <Coffee className="h-4 w-4" />
                      {item.label || t("break")}
                      {item.duration_minutes
                        ? ` · ${item.duration_minutes} min`
                        : ""}
                    </li>
                  );
                }
                const song = item.song;
                return (
                  <li
                    key={`song-${song.id}-${item.position}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className="text-muted-foreground w-6 text-right text-sm tabular-nums">
                      {songNumbers[index]}
                    </span>
                    <Link
                      href={`/dashboard/admin/songs/${song.id}`}
                      className="min-w-0 flex-1 hover:underline"
                    >
                      <span className="block truncate font-medium">
                        {song.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {song.artist_name}
                      </span>
                    </Link>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {[
                        song.tonality,
                        song.tempo ? `${song.tempo} BPM` : null,
                        song.duration ? formatDuration(song.duration) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  );
}
