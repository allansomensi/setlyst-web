import { staticTitle } from "@/lib/page-metadata";
import { fetchServerApi, fetchAllServerPages } from "@/lib/api-server";
import { canManageBandSetlists } from "@/lib/band-permissions";
import { Gig, Setlist, BandWithMembership, QuotaReport } from "@/types/api";
import { GigsTable } from "./_components/gigs-table";
import { BandOption, TourOption } from "./_components/gigs-dialog";
import type { Tour } from "@/types/content";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";

export async function generateMetadata() {
  return staticTitle("gigs");
}

export default async function GigsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tour_id: tourParam } = await searchParams;
  // Three independent sources — one failing (a transient rate limit,
  // timeout) shouldn't take the whole page down when the others loaded
  // fine. `hadError` is what tells GigsTable an empty `gigs` array means
  // "this fetch failed," not "you have no shows" — see LoadErrorNotice.
  const [
    personalGigsRes,
    personalSetlistsRes,
    bandsRaw,
    personalToursRes,
    quotas,
  ] = await Promise.all([
    fetchOrFailed(fetchAllServerPages<Gig>("/gigs")),
    fetchOrFailed(fetchAllServerPages<Setlist>("/setlists")),
    fetchOrFailed(fetchServerApi<BandWithMembership[]>("/bands")),
    fetchOrFailed(fetchAllServerPages<Tour>("/tours?status=all")),
    // Only for the usage chip next to "New show": never fatal.
    fetchServerApi<QuotaReport>("/users/me/quotas").catch(() => null),
  ]);

  const personalGigsFailed = personalGigsRes === FETCH_FAILED;
  const personalSetlistsFailed = personalSetlistsRes === FETCH_FAILED;
  const bandsFailed = bandsRaw === FETCH_FAILED;

  const personalGigs = personalGigsFailed ? [] : (personalGigsRes?.data ?? []);
  const personalSetlists = personalSetlistsFailed
    ? []
    : (personalSetlistsRes?.data ?? []);
  const bands = bandsFailed ? [] : bandsRaw;

  const bandsById: Record<string, { name: string; canManage: boolean }> = {};
  for (const band of bands) {
    const canManage = canManageBandSetlists(band);
    bandsById[band.id] = { name: band.name, canManage };
  }

  // Same reasoning per band, for both its gigs and its setlists: one
  // band's data failing to load shouldn't hide every other band's. Each
  // call falls back to a FETCH_FAILED marker (rather than being dropped,
  // like a filtering helper would) so the results stay index-aligned
  // with `bands` below.
  const [bandGigsResults, bandSetlistsResults, bandToursResults] =
    await Promise.all([
      Promise.all(
        bands.map((band) =>
          fetchOrFailed(fetchAllServerPages<Gig>(`/bands/${band.id}/gigs`)),
        ),
      ),
      Promise.all(
        bands.map((band) =>
          fetchOrFailed(
            fetchAllServerPages<Setlist>(`/bands/${band.id}/setlists`),
          ),
        ),
      ),
      Promise.all(
        bands.map((band) =>
          fetchOrFailed(
            fetchAllServerPages<Tour>(`/bands/${band.id}/tours?status=all`),
          ),
        ),
      ),
    ]);
  const tours: TourOption[] = [
    ...(personalToursRes === FETCH_FAILED ? [] : personalToursRes.data),
    ...bandToursResults.flatMap((res) =>
      res === FETCH_FAILED ? [] : res.data,
    ),
  ].map((tour) => ({ id: tour.id, name: tour.name, band_id: tour.band_id }));
  const tourFilter =
    typeof tourParam === "string"
      ? (tours.find((tour) => tour.id === tourParam) ?? null)
      : null;

  const bandGigsFailed = bandGigsResults.some((res) => res === FETCH_FAILED);
  const bandSetlistsFailed = bandSetlistsResults.some(
    (res) => res === FETCH_FAILED,
  );

  const bandGigs = bandGigsResults.flatMap((res) =>
    res === FETCH_FAILED ? [] : (res?.data ?? []),
  );
  const gigs = [...personalGigs, ...bandGigs];

  const setlistsByBandId: Record<string, Setlist[]> = {};
  bands.forEach((band, index) => {
    const res = bandSetlistsResults[index];
    setlistsByBandId[band.id] = res === FETCH_FAILED ? [] : (res?.data ?? []);
  });

  // Only bands the caller can actually create/manage gigs for are offered
  // as a scope in the "new gig" dialog.
  const manageableBands: BandOption[] = bands
    .filter((band) => bandsById[band.id]?.canManage)
    .map((band) => ({
      id: band.id,
      name: band.name,
      setlists: setlistsByBandId[band.id] || [],
    }));

  const hadError =
    personalGigsFailed ||
    personalSetlistsFailed ||
    bandsFailed ||
    bandGigsFailed ||
    bandSetlistsFailed;

  return (
    <div className="w-full space-y-4">
      <GigsTable
        initialGigs={gigs}
        bandsById={bandsById}
        personalSetlists={personalSetlists}
        bands={manageableBands}
        loadError={hadError}
        tours={tours}
        tourFilter={tourFilter}
        quotas={quotas}
      />
    </div>
  );
}
