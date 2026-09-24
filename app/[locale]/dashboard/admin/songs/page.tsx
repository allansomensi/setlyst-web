import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActiveFilters } from "@/components/staff/active-filters";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ListPagination, ListToolbar } from "@/components/staff/list-controls";
import { TagChip } from "@/components/tags/tag-chip";
import { Link } from "@/i18n/routing";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { formatApiDate } from "@/lib/dates";
import type { AdminSongSummary, PaginatedResponse } from "@/types/api";
import { requireStaffPage } from "@/lib/staff-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("adminSongs") };
}

export default async function AdminSongsPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  await requireStaffPage("content");
  const t = await getTranslations("staff.songs");
  const locale = await getLocale();
  const params = await searchParams;
  const { query, page } = adminListQuery(params, ["q", "user_id", "band_id"]);
  const result = await fetchServerApi<PaginatedResponse<AdminSongSummary>>(
    `/admin/songs?${query}`,
  );
  const songs = result.data ?? [];
  const firstRow = songs[0];

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <ListToolbar placeholder={t("search")} />
      <ActiveFilters
        basePath="/dashboard/admin/songs"
        params={params}
        labels={{
          user_id: firstRow?.owner_username
            ? `@${firstRow.owner_username}`
            : t("filterUser"),
          band_id: firstRow?.band_name ?? t("filterBand"),
        }}
      />

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.song")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("columns.owner")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.details")}
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                {t("columns.tags")}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("columns.updated")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {songs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              songs.map((song) => (
                <TableRow key={song.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/admin/songs/${song.id}`}
                      className="group block min-w-0"
                    >
                      <span className="block truncate font-medium group-hover:underline">
                        {song.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {song.artist_name}
                        {!song.has_lyrics && ` · ${t("noLyrics")}`}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      href={`/dashboard/users/${song.user_id}`}
                      className="hover:underline"
                    >
                      @{song.owner_username ?? "—"}
                    </Link>
                    {song.band_id && (
                      <Link
                        href={`/dashboard/admin/bands/${song.band_id}`}
                        className="text-muted-foreground block text-xs hover:underline"
                      >
                        {song.band_name}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                    {[
                      song.tonality,
                      song.tempo ? `${song.tempo} BPM` : null,
                      t("inSetlists", { count: song.setlist_count }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {song.tags.slice(0, 3).map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                      {song.tags.length > 3 && (
                        <span className="text-muted-foreground text-xs">
                          +{song.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                    {formatApiDate(song.updated_at, locale)}
                    {song.updated_by_username && (
                      <span className="block text-xs">
                        @{song.updated_by_username}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={page}
        totalPages={result.meta?.total_pages ?? 1}
        totalItems={result.meta?.total_items ?? songs.length}
      />
    </>
  );
}
