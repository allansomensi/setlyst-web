import { AuditStamp } from "@/components/audit-stamp";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { TagChip } from "@/components/tags/tag-chip";
import { Link } from "@/i18n/routing";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { formatDuration } from "@/lib/utils";
import { formatGenre, type AdminSongDetail } from "@/types/api";
import { SongAdminActions } from "./_components/song-admin-actions";
import { getSession } from "@/lib/server/session";

type Params = Promise<{ id: string }>;

async function loadSong(id: string): Promise<AdminSongDetail | null> {
  try {
    return await fetchServerApi<AdminSongDetail>(
      `/admin/songs/${encodeURIComponent(id)}`,
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
  const detail = await loadSong(id).catch(() => null);
  return { title: detail?.song.title ?? t("adminSongs") };
}

export default async function AdminSongPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await loadSong(id);
  if (!detail) notFound();
  const { song, summary } = detail;

  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  const t = await getTranslations("staff.songDetail");
  const tNav = await getTranslations("nav");

  const facts = [
    song.tonality && { label: t("key"), value: song.tonality },
    song.tempo && { label: t("bpm"), value: String(song.tempo) },
    song.genre && { label: t("genre"), value: formatGenre(song.genre) },
    song.duration && {
      label: t("duration"),
      value: formatDuration(song.duration),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <PageBreadcrumbs
        items={[
          { label: tNav("adminSongs"), href: "/dashboard/admin/songs" },
          { label: song.title },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {song.title}
          </h1>
          <p className="text-muted-foreground">{song.artist_name}</p>
          <p className="text-muted-foreground text-sm">
            {t.rich("owner", {
              owner: () => (
                <Link
                  href={`/dashboard/users/${song.user_id}`}
                  className="text-foreground hover:underline"
                >
                  @{summary.owner_username ?? "—"}
                </Link>
              ),
            })}
            {song.band_id && summary.band_name && (
              <>
                {" · "}
                <Link
                  href={`/dashboard/admin/bands/${song.band_id}`}
                  className="text-foreground hover:underline"
                >
                  {summary.band_name}
                </Link>
              </>
            )}
          </p>
          <AuditStamp
            updatedAt={song.updated_at}
            updatedBy={song.updated_by_username}
          />
        </div>
        {isAdmin && <SongAdminActions song={song} />}
      </div>

      <div className="flex flex-wrap gap-2">
        {facts.map((fact) => (
          <Badge key={fact.label} variant="secondary">
            <span className="text-muted-foreground">{fact.label}</span>{" "}
            {fact.value}
          </Badge>
        ))}
        <Badge variant="outline">
          {t("inSetlists", { count: summary.setlist_count })}
        </Badge>
        {song.tags.map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("lyrics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChordProRenderer content={song.lyrics ?? ""} fontSize={1} />
        </CardContent>
      </Card>
    </>
  );
}
