import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { AuditEntry } from "@/components/staff/audit-entry";
import {
  hasListFilters,
  ListEmptyState,
} from "@/components/staff/list-empty-state";
import { ListPagination, ListToolbar } from "@/components/staff/list-controls";
import { DateRangeFilter } from "@/components/staff/date-range-filter";
import { ExportCsvButton } from "@/components/staff/export-csv-button";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { withoutPaging } from "@/lib/console";
import { dayRangeToUtc } from "@/lib/date-range";
import { getRequestTimeZone } from "@/lib/server/time-zone";
import type { AuditLogEntry, PaginatedResponse } from "@/types/api";
import { requireStaffPage } from "@/lib/staff-guard";

const CATEGORIES = [
  "user.",
  "band.",
  "song.",
  "setlist.",
  "share.",
  "settings.",
  "moderation.",
  "announcement.",
  "release_note.",
  "billing.",
  "promo.",
  "promotion.",
  "finance.",
  "staff.",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("adminAudit") };
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  const { can } = await requireStaffPage("audit");
  const t = await getTranslations("staff.auditPage");
  const params = await searchParams;
  const { query, page } = adminListQuery(params, [
    "q",
    "action",
    "actor_id",
    "target_id",
  ]);
  // `?from=`/`?to=` are whole days in the viewer's calendar; the API takes
  // UTC instants (`to` exclusive), placed at the viewer's time zone.
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const range = dayRangeToUtc(
    first(params.from),
    first(params.to),
    await getRequestTimeZone(),
  );
  const apiQuery = new URLSearchParams(query);
  if (range.from) apiQuery.set("from", range.from);
  if (range.to) apiQuery.set("to", range.to);
  const result = await fetchServerApi<PaginatedResponse<AuditLogEntry>>(
    `/admin/audit-logs?${apiQuery}`,
  );
  const entries = result.data ?? [];

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          // The same filters as the list (dates already in UTC), all pages.
          can("exports") && (
            <ExportCsvButton
              kind="audit-logs"
              query={withoutPaging(apiQuery)}
            />
          )
        }
      />
      <ListToolbar
        placeholder={t("search")}
        filters={[
          {
            param: "action",
            label: t("category"),
            options: [
              { value: "all", label: t("categories.all") },
              ...CATEGORIES.map((value) => ({
                value,
                label: t(`categories.${value.replace(".", "")}`),
              })),
            ],
          },
        ]}
      >
        <DateRangeFilter />
      </ListToolbar>

      <Card className="gap-0 py-1">
        <CardContent className="divide-y">
          {entries.length === 0 ? (
            <ListEmptyState
              icon={ScrollText}
              title={t("empty")}
              filtered={hasListFilters(params)}
              clearHref="/dashboard/admin/audit"
            />
          ) : (
            entries.map((entry) => <AuditEntry key={entry.id} entry={entry} />)
          )}
        </CardContent>
      </Card>

      <ListPagination
        page={page}
        totalPages={result.meta?.total_pages ?? 1}
        totalItems={result.meta?.total_items ?? entries.length}
      />
    </>
  );
}
