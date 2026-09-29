import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getTranslations } from "next-intl/server";
import {
  ApiError,
  fetchAllServerPages,
  fetchServerApi,
} from "@/lib/api-server";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { fetchServerApiOnce } from "@/lib/server-data";
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
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const t = await getTranslations("tours");
  try {
    const tour = await fetchServerApiOnce<TourDetail>(`/tours/${id}`);
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
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const t = await getTranslations("tours");
  const tNav = await getTranslations("nav");

  let tour: TourDetail;
  try {
    tour = await fetchServerApiOnce<TourDetail>(`/tours/${id}`);
  } catch (error) {
    if (error instanceof ApiError && [400, 403, 404].includes(error.status)) {
      notFound();
    }
    throw error;
  }

  // The band (for what the person may do) and the same-scope gigs (to
  // link) and setlists (for "Adicionar show") all depend on the tour
  // alone, so they load together; whether the lists are *used* is
  // decided afterwards.
  const [band, gigsRes, setlistsRes] = await Promise.all([
    tour.band_id
      ? fetchServerApi<BandWithMembership>(`/bands/${tour.band_id}`).catch(
          () => null,
        )
      : Promise.resolve(null),
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
  ]);
  const canManage = !tour.band_id || (!!band && canManageBandSetlists(band));

  const linkableGigs =
    !canManage || gigsRes === FETCH_FAILED
      ? []
      : gigsRes.data.filter(
          (gig) => !gig.tour_id && (gig.band_id ?? null) === tour.band_id,
        );
  const setlists =
    !canManage || setlistsRes === FETCH_FAILED ? [] : setlistsRes.data;

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
