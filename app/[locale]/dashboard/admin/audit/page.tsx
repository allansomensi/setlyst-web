import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { AuditEntry } from "@/components/staff/audit-entry";
import { ListPagination, ListToolbar } from "@/components/staff/list-controls";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import type { AuditLogEntry, PaginatedResponse } from "@/types/api";

const CATEGORIES = [
  "user.",
  "band.",
  "song.",
  "setlist.",
  "share.",
  "settings.",
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
  const t = await getTranslations("staff.auditPage");
  const { query, page } = adminListQuery(await searchParams, [
    "q",
    "action",
    "actor_id",
    "target_id",
  ]);
  const result = await fetchServerApi<PaginatedResponse<AuditLogEntry>>(
    `/admin/audit-logs?${query}`,
  );
  const entries = result.data ?? [];

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
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
      />

      <Card>
        <CardContent className="divide-y py-2">
          {entries.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {t("empty")}
            </p>
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
