import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ApiError,
  fetchAllServerPages,
  fetchServerApi,
} from "@/lib/api-server";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { canManageBandSetlists } from "@/lib/band-permissions";
import type { BandWithMembership, Gig, Setlist } from "@/types/api";
import type { TourDetail } from "@/types/content";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { TourDetailView } from "./_components/tour-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("tours");
  try {
    const tour = await fetchServerApi<TourDetail>(`/tours/${id}`);
    return { title: tour.name };
  } catch {
    return { title: t("title") };
  }
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("tours");
  const tNav = await getTranslations("nav");

  let tour: TourDetail;
  try {
    tour = await fetchServerApi<TourDetail>(`/tours/${id}`);
  } catch (error) {
    if (error instanceof ApiError && [400, 403, 404].includes(error.status)) {
      notFound();
    }
    throw error;
  }

  const band = tour.band_id
    ? await fetchServerApi<BandWithMembership>(`/bands/${tour.band_id}`).catch(
        () => null,
      )
    : null;
  const canManage = !tour.band_id || (!!band && canManageBandSetlists(band));

  // Same-scope gigs (to link) and setlists (for "Adicionar show").
  const [gigsRes, setlistsRes] = canManage
    ? await Promise.all([
        fetchOrFailed(
          fetchAllServerPages<Gig>(
            tour.band_id ? `/bands/${tour.band_id}/gigs` : "/gigs",
          ),
        ),
        fetchOrFailed(
          fetchAllServerPages<Setlist>(
            tour.band_id ? `/bands/${tour.band_id}/setlists` : "/setlists",
          ),
        ),
      ])
    : ([FETCH_FAILED, FETCH_FAILED] as const);

  const linkableGigs =
    gigsRes === FETCH_FAILED
      ? []
      : gigsRes.data.filter(
          (gig) => !gig.tour_id && (gig.band_id ?? null) === tour.band_id,
        );
  const setlists = setlistsRes === FETCH_FAILED ? [] : setlistsRes.data;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <PageBreadcrumbs
        items={[
          ...(band
            ? [
                { label: tNav("bands"), href: "/dashboard/bands" },
                { label: band.name, href: `/dashboard/bands/${band.id}` },
              ]
            : []),
          { label: t("title"), href: "/dashboard/tours" },
          { label: tour.name },
        ]}
      />
      <TourDetailView
        tour={tour}
        band={band ? { id: band.id, name: band.name } : null}
        canManage={canManage}
        linkableGigs={linkableGigs}
        setlists={setlists}
      />
    </div>
  );
}
