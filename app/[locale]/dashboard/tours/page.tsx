import { getTranslations } from "next-intl/server";
import { fetchAllServerPages, fetchServerApi } from "@/lib/api-server";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { canManageBandSetlists } from "@/lib/band-permissions";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import type { BandWithMembership } from "@/types/api";
import type { Tour } from "@/types/content";
import { ToursView } from "./_components/tours-view";

export async function generateMetadata() {
  const t = await getTranslations("tours");
  return { title: t("title") };
}

export default async function ToursPage() {
  const [personalRes, bandsRes, entitlements] = await Promise.all([
    fetchOrFailed(fetchAllServerPages<Tour>("/tours?status=all")),
    fetchOrFailed(fetchServerApi<BandWithMembership[]>("/bands")),
    getEntitlements(),
  ]);
  const bands = bandsRes === FETCH_FAILED ? [] : bandsRes;
  const bandTours = await Promise.all(
    bands.map((band) =>
      fetchOrFailed(
        fetchAllServerPages<Tour>(`/bands/${band.id}/tours?status=all`),
      ),
    ),
  );

  const failed =
    personalRes === FETCH_FAILED ||
    bandsRes === FETCH_FAILED ||
    bandTours.some((res) => res === FETCH_FAILED);
  const tours = [
    ...(personalRes === FETCH_FAILED ? [] : personalRes.data),
    ...bandTours.flatMap((res) => (res === FETCH_FAILED ? [] : res.data)),
  ];

  return (
    <ToursView
      tours={tours}
      bands={bands.map((b) => ({ id: b.id, name: b.name }))}
      creatableBands={bands
        .filter(canManageBandSetlists)
        .map((b) => ({ id: b.id, name: b.name }))}
      canCreate={hasFeature(entitlements, "tours")}
      loadError={failed}
    />
  );
}
