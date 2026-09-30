import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { fetchServerApi } from "@/lib/api-server";
import { pickLocalized } from "@/lib/localized";
import { requireStaffPage } from "@/lib/staff-guard";
import { getPlanOptions } from "@/lib/staff-data";
import type { Promotion } from "@/types/staff";
import { PromotionsManager } from "./_components/promotions-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billingAdmin.promotions");
  return { title: t("title") };
}

export default async function PromotionsPage() {
  await requireStaffPage("promotions", "/dashboard/admin/billing");
  const t = await getTranslations("billingAdmin.promotions");
  const locale = await getLocale();
  const [promotions, planOptions] = await Promise.all([
    fetchServerApi<Promotion[]>("/admin/promotions").catch(() => null),
    getPlanOptions(),
  ]);
  const plans = planOptions.map((p) => ({
    code: p.code,
    name: pickLocalized(p.name, locale) || p.code,
  }));

  return (
    <>
      {/* The manager renders the header itself when it loads, so its
          "new promotion" button sits in the header like on every other
          staff page (it opens the manager's own dialog). */}
      {promotions === null ? (
        <>
          <AdminPageHeader title={t("title")} description={t("description")} />
          <LoadErrorNotice />
        </>
      ) : (
        <PromotionsManager promotions={promotions} plans={plans} />
      )}
    </>
  );
}
