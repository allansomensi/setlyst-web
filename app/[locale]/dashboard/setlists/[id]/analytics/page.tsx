import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getTranslations } from "next-intl/server";
import { entityTitle } from "@/lib/page-metadata";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import { setlistDisplayTitle } from "@/lib/repertoire";
import { BandWithMembership, Setlist, SetlistItem } from "@/types/api";
import { DetailBackButton } from "@/components/detail-header";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { SetlistFlowReport } from "./_components/setlist-flow-report";
import { fetchServerApiOnce } from "@/lib/server-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  return entityTitle<Setlist>(
    `/setlists/${id}`,
    (s) => s.title,
    "setlistAnalytics",
    "setlists",
  );
}

export default async function SetlistAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const t = await getTranslations("setlists.analytics");
  const tSetlists = await getTranslations("setlists");
  const tNav = await getTranslations("nav");

  const [setlist, items, entitlements] = await Promise.all([
    fetchServerApiOnce<Setlist>(`/setlists/${id}`),
    fetchServerApi<SetlistItem[]>(`/setlists/${id}/items`),
    getEntitlements(),
  ]).catch((error) => {
    if (error instanceof ApiError && [400, 403, 404].includes(error.status)) {
      notFound();
    }
    throw error;
  });

  const title = setlistDisplayTitle(setlist, tSetlists("repertoire.name"));
  // A band setlist's trail goes through its band, as on the setlist's own
  // page (it used to say "Setlists", a list the band setlist isn't
  // reached from). Never fatal: without it the trail is the generic one.
  const band = setlist.band_id
    ? await fetchServerApi<BandWithMembership>(
        `/bands/${setlist.band_id}`,
      ).catch(() => null)
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <PageBreadcrumbs
        items={[
          ...(band
            ? [
                { label: tNav("bands"), href: "/dashboard/bands" },
                { label: band.name, href: `/dashboard/bands/${band.id}` },
              ]
            : [{ label: tNav("setlists"), href: "/dashboard/setlists" }]),
          { label: title, href: `/dashboard/setlists/${id}` },
          { label: t("title") },
        ]}
      />

      <SetlistFlowReport
        setlistId={id}
        title={title}
        items={items}
        canExport={hasFeature(entitlements, "analytics_export")}
        heading={
          <>
            <DetailBackButton
              href={`/dashboard/setlists/${id}`}
              label={title}
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("title")}
              </h1>
              <p className="text-muted-foreground truncate">{title}</p>
            </div>
          </>
        }
      />
    </div>
  );
}
