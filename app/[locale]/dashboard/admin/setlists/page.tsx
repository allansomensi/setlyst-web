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
import { ShareStatusBadge } from "@/components/staff/share-moderation";
import { Link } from "@/i18n/routing";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { formatApiDate } from "@/lib/dates";
import { formatDuration } from "@/lib/utils";
import type { AdminSetlistSummary, PaginatedResponse } from "@/types/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("adminSetlists") };
}

export default async function AdminSetlistsPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  const t = await getTranslations("staff.setlists");
  const tShare = await getTranslations("staff.share");
  const locale = await getLocale();
  const params = await searchParams;
  const { query, page } = adminListQuery(params, [
    "q",
    "user_id",
    "band_id",
    "shared",
  ]);
  const result = await fetchServerApi<PaginatedResponse<AdminSetlistSummary>>(
    `/admin/setlists?${query}`,
  );
  const setlists = result.data ?? [];
  const firstRow = setlists[0];

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <ListToolbar
        placeholder={t("search")}
        filters={[
          {
            param: "shared",
            label: tShare("filterLabel"),
            options: [
              { value: "all", label: tShare("filterAll") },
              { value: "true", label: tShare("filterPublic") },
              { value: "false", label: tShare("filterNotPublic") },
            ],
          },
        ]}
      />
      <ActiveFilters
        basePath="/dashboard/admin/setlists"
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
              <TableHead>{t("columns.setlist")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("columns.owner")}
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                {t("columns.songs")}
              </TableHead>
              <TableHead>{t("columns.link")}</TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.updated")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setlists.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              setlists.map((setlist) => (
                <TableRow key={setlist.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/admin/setlists/${setlist.id}`}
                      className="group block min-w-0"
                    >
                      <span className="block truncate font-medium group-hover:underline">
                        {setlist.title}
                      </span>
                      {setlist.description && (
                        <span className="text-muted-foreground block max-w-72 truncate text-xs">
                          {setlist.description}
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      href={`/dashboard/users/${setlist.user_id}`}
                      className="hover:underline"
                    >
                      @{setlist.owner_username ?? "—"}
                    </Link>
                    {setlist.band_id && (
                      <Link
                        href={`/dashboard/admin/bands/${setlist.band_id}`}
                        className="text-muted-foreground block text-xs hover:underline"
                      >
                        {setlist.band_name}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-right text-sm tabular-nums sm:table-cell">
                    {setlist.song_count}
                    {setlist.total_duration > 0 && (
                      <span className="block text-xs">
                        {formatDuration(setlist.total_duration)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ShareStatusBadge state={setlist} />
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                    {formatApiDate(setlist.updated_at, locale)}
                    {setlist.updated_by_username && (
                      <span className="block text-xs">
                        @{setlist.updated_by_username}
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
        totalItems={result.meta?.total_items ?? setlists.length}
      />
    </>
  );
}
