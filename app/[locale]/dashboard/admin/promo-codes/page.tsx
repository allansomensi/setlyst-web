import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { TicketPercent } from "lucide-react";
import {
  hasListFilters,
  ListEmptyState,
} from "@/components/staff/list-empty-state";
import { ListPagination, ListToolbar } from "@/components/staff/list-controls";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { adminListQuery, type ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { pickLocalized } from "@/lib/localized";
import { requireStaffPage } from "@/lib/staff-guard";
import { getPlanOptions } from "@/lib/staff-data";
import type { PaginatedResponse } from "@/types/api";
import type { PromoCode } from "@/types/staff";
import { CreatePromoCodeButton } from "./_components/promo-code-dialogs";
import { PromoCodesTable } from "./_components/promo-codes-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billingAdmin.promoCodes");
  return { title: t("title") };
}

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  await requireStaffPage("promoCodes", "/dashboard/admin/billing");
  const t = await getTranslations("billingAdmin.promoCodes");
  const locale = await getLocale();
  const params = await searchParams;
  const { query, page } = adminListQuery(params, ["q"]);
  const [result, planOptions] = await Promise.all([
    fetchServerApi<PaginatedResponse<PromoCode>>(
      `/admin/promo-codes?${query}`,
    ).catch(() => null),
    getPlanOptions(),
  ]);
  const plans = planOptions.map((p) => ({
    code: p.code,
    name: pickLocalized(p.name, locale) || p.code,
  }));
  const items = result?.data ?? [];

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={<CreatePromoCodeButton plans={plans} />}
      />
      <ListToolbar placeholder={t("search")} />
      {result === null ? (
        <LoadErrorNotice />
      ) : items.length === 0 ? (
        <ListEmptyState
          compact={false}
          icon={TicketPercent}
          title={t("emptyTitle")}
          description={
            hasListFilters(params) ? undefined : t("emptyDescription")
          }
          filtered={hasListFilters(params)}
          clearHref="/dashboard/admin/promo-codes"
          className="bg-card rounded-xl border border-dashed"
        />
      ) : (
        <PromoCodesTable codes={items} plans={plans} />
      )}
      <ListPagination
        page={page}
        totalPages={result?.meta?.total_pages ?? 1}
        totalItems={result?.meta?.total_items ?? items.length}
      />
    </>
  );
}
