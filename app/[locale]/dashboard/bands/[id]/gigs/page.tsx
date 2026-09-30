import { entityTitle } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { notFoundOnMissing } from "@/lib/api-not-found";
import { fetchAllServerPages } from "@/lib/api-server";
import { canManageBandSetlists } from "@/lib/band-permissions";
import { BandWithMembership, Gig, Setlist } from "@/types/api";
import { GigsTable } from "@/app/[locale]/dashboard/gigs/_components/gigs-table";
import { BandOption } from "@/app/[locale]/dashboard/gigs/_components/gigs-dialog";
import { DetailBackButton, DetailHeader } from "@/components/detail-header";
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
    "bandGigs",
    "bands",
  );
}

export default async function BandGigsPage({
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

  const [band, gigsRes, setlistsRes] = await Promise.all([
    fetchServerApiOnce<BandWithMembership>(`/bands/${id}`),
    fetchAllServerPages<Gig>(`/bands/${id}/gigs`),
    fetchAllServerPages<Setlist>(`/bands/${id}/setlists`),
  ]).catch(notFoundOnMissing);

  const gigs = gigsRes.data || [];
  const setlists = setlistsRes.data || [];
  const canManage = canManageBandSetlists(band);

  const bandsById = { [id]: { name: band.name, canManage } };
  const bandOptions: BandOption[] = canManage
    ? [{ id, name: band.name, setlists }]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageBreadcrumbs
        items={[
          { label: tNav("bands"), href: "/dashboard/bands" },
          { label: band.name, href: `/dashboard/bands/${id}` },
          { label: t("bandGigsTitle") },
        ]}
      />

      <DetailHeader>
        <DetailBackButton href={`/dashboard/bands/${id}`} label={band.name} />
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("bandGigsTitle")}
          </h1>
          <p className="text-muted-foreground">{band.name}</p>
        </div>
      </DetailHeader>

      <GigsTable
        initialGigs={gigs}
        bandsById={bandsById}
        personalSetlists={[]}
        bands={bandOptions}
        fixedBandId={id}
        // Members without `manage_setlists` can't create shows here.
        canCreate={canManage}
      />
    </div>
  );
}
