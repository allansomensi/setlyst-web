import { entityTitle } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { notFoundOnMissing } from "@/lib/api-not-found";
import { fetchAllServerPages } from "@/lib/api-server";
import { canManageBandSetlists } from "@/lib/band-permissions";
import { BandWithMembership, Setlist } from "@/types/api";
import { SetlistsTable } from "@/app/[locale]/dashboard/setlists/_components/setlists-table";
import { getTranslations } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
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
  return entityTitle<BandWithMembership>(
    `/bands/${id}`,
    (b) => b.name,
    "bandSetlists",
    "bands",
  );
}

export default async function BandSetlistsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const t = await getTranslations("bands");
  const tNav = await getTranslations("nav");
  const tSetlists = await getTranslations("setlists");

  const [band, setlistsRes] = await Promise.all([
    fetchServerApiOnce<BandWithMembership>(`/bands/${id}`),
    fetchAllServerPages<Setlist>(`/bands/${id}/setlists`),
  ]).catch(notFoundOnMissing);

  const setlists = setlistsRes.data || [];
  const canManage = canManageBandSetlists(band);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageBreadcrumbs
        items={[
          { label: tNav("bands"), href: "/dashboard/bands" },
          { label: band.name, href: `/dashboard/bands/${id}` },
          { label: t("bandSetlistsTitle") },
        ]}
      />

      <SetlistsTable
        initialSetlists={setlists}
        bandId={id}
        bandsById={{ [id]: { name: band.name, canManage } }}
        // Members without `manage_setlists` can't create setlists here.
        canCreate={canManage}
        heading={{
          title: t("bandSetlistsTitle"),
          description: tSetlists("bandSubtitle", { name: band.name }),
          backHref: `/dashboard/bands/${id}`,
          backLabel: band.name,
        }}
      />
    </div>
  );
}
