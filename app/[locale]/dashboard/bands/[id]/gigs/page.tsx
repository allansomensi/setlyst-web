import { fetchServerApi, fetchAllServerPages } from "@/lib/api-server";
import { BandWithMembership, Gig, Setlist, BAND_ROLE_LEVEL } from "@/types/api";
import { GigsTable } from "@/app/[locale]/dashboard/gigs/_components/gigs-table";
import { BandOption } from "@/app/[locale]/dashboard/gigs/_components/gigs-dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/nav-link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

export default async function BandGigsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("bands");
  const tNav = await getTranslations("nav");

  const [band, gigsRes, setlistsRes] = await Promise.all([
    fetchServerApi<BandWithMembership>(`/bands/${id}`),
    fetchAllServerPages<Gig>(`/bands/${id}/gigs`),
    fetchAllServerPages<Setlist>(`/bands/${id}/setlists`),
  ]);

  const gigs = gigsRes.data || [];
  const setlists = setlistsRes.data || [];
  const canManage =
    BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.moderator ||
    (band.my_role === "member" && band.members_can_manage_setlists);

  const bandsById = { [id]: { name: band.name, canManage } };
  const bandOptions: BandOption[] = canManage
    ? [{ id, name: band.name, setlists }]
    : [];

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumbs
        items={[
          { label: tNav("bands"), href: "/dashboard/bands" },
          { label: band.name, href: `/dashboard/bands/${id}` },
          { label: t("bandGigsTitle") },
        ]}
      />

      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/bands/${id}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("bandGigsTitle")}
          </h1>
        </div>
      </div>

      <GigsTable
        initialGigs={gigs}
        bandsById={bandsById}
        personalSetlists={[]}
        bands={bandOptions}
        fixedBandId={id}
      />
    </div>
  );
}
