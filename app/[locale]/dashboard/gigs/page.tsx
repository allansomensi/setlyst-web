import { fetchServerApi } from "@/lib/api-server";
import {
  PaginatedResponse,
  Gig,
  Setlist,
  BandWithMembership,
  BAND_ROLE_LEVEL,
} from "@/types/api";
import { GigsTable } from "./_components/gigs-table";
import { BandOption } from "./_components/gigs-dialog";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";

export default async function GigsPage() {
  // Three independent sources — one failing (a transient rate limit,
  // timeout) shouldn't take the whole page down when the others loaded
  // fine. `hadError` is what tells GigsTable an empty `gigs` array means
  // "this fetch failed," not "you have no shows" — see LoadErrorNotice.
  const [personalGigsRes, personalSetlistsRes, bandsRaw] = await Promise.all([
    fetchOrFailed(
      fetchServerApi<PaginatedResponse<Gig>>("/gigs?page=1&per_page=100"),
    ),
    fetchOrFailed(
      fetchServerApi<PaginatedResponse<Setlist>>(
        "/setlists?page=1&per_page=100",
      ),
    ),
    fetchOrFailed(fetchServerApi<BandWithMembership[]>("/bands")),
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
    const canManage =
      BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.moderator ||
      (band.my_role === "member" && band.members_can_manage_setlists);
    bandsById[band.id] = { name: band.name, canManage };
  }

  // Same reasoning per band, for both its gigs and its setlists: one
  // band's data failing to load shouldn't hide every other band's. Each
  // call falls back to a FETCH_FAILED marker (rather than being dropped,
  // like a filtering helper would) so the results stay index-aligned
  // with `bands` below.
  const [bandGigsResults, bandSetlistsResults] = await Promise.all([
    Promise.all(
      bands.map((band) =>
        fetchOrFailed(
          fetchServerApi<PaginatedResponse<Gig>>(
            `/bands/${band.id}/gigs?page=1&per_page=100`,
          ),
        ),
      ),
    ),
    Promise.all(
      bands.map((band) =>
        fetchOrFailed(
          fetchServerApi<PaginatedResponse<Setlist>>(
            `/bands/${band.id}/setlists?page=1&per_page=100`,
          ),
        ),
      ),
    ),
  ]);

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
      />
    </div>
  );
}
