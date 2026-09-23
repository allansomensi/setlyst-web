import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, ListMusic } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ListPagination, ListToolbar } from "@/components/staff/list-controls";
import {
  ShareModerationButton,
  ShareStatusBadge,
} from "@/components/staff/share-moderation";
import { Link } from "@/i18n/routing";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { formatApiDate } from "@/lib/dates";
import type { PaginatedResponse, SharedLink } from "@/types/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("adminLinks") };
}

export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  const t = await getTranslations("staff.links");
  const tShare = await getTranslations("staff.share");
  const locale = await getLocale();
  const { query, page } = adminListQuery(await searchParams, ["q", "shared"]);
  const result = await fetchServerApi<PaginatedResponse<SharedLink>>(
    `/admin/shared-links?${query}`,
  );
  const links = result.data ?? [];

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
              { value: "all", label: t("filterAll") },
              { value: "true", label: t("filterActive") },
              { value: "false", label: t("filterLocked") },
            ],
          },
        ]}
      />

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.item")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("columns.owner")}
              </TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.updated")}
              </TableHead>
              <TableHead className="text-right">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => {
                const Icon = link.kind === "setlist" ? ListMusic : CalendarDays;
                const publicPath = link.share_token
                  ? `/${link.kind === "setlist" ? "s" : "g"}/${link.share_token}`
                  : null;
                return (
                  <TableRow key={`${link.kind}-${link.id}`}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon
                          className="text-muted-foreground h-4 w-4 shrink-0"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          {link.kind === "setlist" ? (
                            <Link
                              href={`/dashboard/admin/setlists/${link.id}`}
                              className="block truncate font-medium hover:underline"
                            >
                              {link.title}
                            </Link>
                          ) : (
                            <span className="block truncate font-medium">
                              {link.title}
                            </span>
                          )}
                          <span className="text-muted-foreground block truncate text-xs">
                            {t(`kinds.${link.kind}`)}
                            {publicPath && (
                              <>
                                {" · "}
                                <a
                                  href={publicPath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {`${publicPath.slice(0, 12)}…`}
                                </a>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Link
                        href={`/dashboard/users/${link.owner_id}`}
                        className="hover:underline"
                      >
                        @{link.owner_username ?? "—"}
                      </Link>
                      {link.band_name && (
                        <span className="text-muted-foreground block text-xs">
                          {link.band_name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ShareStatusBadge state={link} />
                      {link.share_locked_at && (
                        <span className="text-muted-foreground mt-1 block max-w-56 text-xs">
                          {t("lockedBy", {
                            username: link.share_locked_by_username ?? "—",
                            date: formatApiDate(link.share_locked_at, locale),
                          })}
                          {link.share_lock_reason &&
                            `: ${link.share_lock_reason}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {formatApiDate(link.updated_at, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ShareModerationButton state={link} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={page}
        totalPages={result.meta?.total_pages ?? 1}
        totalItems={result.meta?.total_items ?? links.length}
      />
    </>
  );
}
