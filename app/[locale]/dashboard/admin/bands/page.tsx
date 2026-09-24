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
import { BandAvatar } from "@/components/bands/band-avatar";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ListPagination, ListToolbar } from "@/components/staff/list-controls";
import { Link } from "@/i18n/routing";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { formatApiDate } from "@/lib/dates";
import type { AdminBandSummary, PaginatedResponse } from "@/types/api";
import { requireStaffPage } from "@/lib/staff-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("adminBands") };
}

export default async function AdminBandsPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  await requireStaffPage("content");
  const t = await getTranslations("staff.bands");
  const locale = await getLocale();
  const { query, page } = adminListQuery(await searchParams, ["q", "user_id"]);
  const result = await fetchServerApi<PaginatedResponse<AdminBandSummary>>(
    `/admin/bands?${query}`,
  );
  const bands = result.data ?? [];

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <ListToolbar placeholder={t("search")} />

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.band")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("columns.owner")}
              </TableHead>
              <TableHead className="text-right">
                {t("columns.members")}
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                {t("columns.content")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.updated")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bands.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              bands.map((band) => (
                <TableRow key={band.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/admin/bands/${band.id}`}
                      className="group flex items-center gap-3"
                    >
                      <BandAvatar
                        bandId={band.id}
                        name={band.name}
                        logoUrl={band.logo_url}
                        className="h-8 w-8"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium group-hover:underline">
                          {band.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          /{band.slug}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {band.owner_id ? (
                      <Link
                        href={`/dashboard/users/${band.owner_id}`}
                        className="hover:underline"
                      >
                        @{band.owner_username}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {band.member_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-right text-xs sm:table-cell">
                    {t("contentSummary", {
                      songs: band.song_count,
                      setlists: band.setlist_count,
                      gigs: band.gig_count,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                    {formatApiDate(band.updated_at, locale)}
                    {band.updated_by_username && (
                      <span className="block text-xs">
                        @{band.updated_by_username}
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
        totalItems={result.meta?.total_items ?? bands.length}
      />
    </>
  );
}
