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

export default async function GigsPage() {
  const [personalGigsRes, personalSetlistsRes, bands] = await Promise.all([
    fetchServerApi<PaginatedResponse<Gig>>("/gigs?page=1&per_page=100"),
    fetchServerApi<PaginatedResponse<Setlist>>("/setlists?page=1&per_page=100"),
    fetchServerApi<BandWithMembership[]>("/bands"),
  ]);

  const personalGigs = personalGigsRes.data || [];
  const personalSetlists = personalSetlistsRes.data || [];

  const bandsById: Record<string, { name: string; canManage: boolean }> = {};
  for (const band of bands) {
    const canManage =
      BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.moderator ||
      (band.my_role === "member" && band.members_can_manage_setlists);
    bandsById[band.id] = { name: band.name, canManage };
  }

  const [bandGigsResults, bandSetlistsResults] = await Promise.all([
    Promise.all(
      bands.map((band) =>
        fetchServerApi<PaginatedResponse<Gig>>(
          `/bands/${band.id}/gigs?page=1&per_page=100`,
        ),
      ),
    ),
    Promise.all(
      bands.map((band) =>
        fetchServerApi<PaginatedResponse<Setlist>>(
          `/bands/${band.id}/setlists?page=1&per_page=100`,
        ),
      ),
    ),
  ]);

  const bandGigs = bandGigsResults.flatMap((res) => res.data || []);
  const gigs = [...personalGigs, ...bandGigs];

  const setlistsByBandId: Record<string, Setlist[]> = {};
  bands.forEach((band, index) => {
    setlistsByBandId[band.id] = bandSetlistsResults[index]?.data || [];
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

  return (
    <div className="w-full space-y-4">
      <GigsTable
        initialGigs={gigs}
        bandsById={bandsById}
        personalSetlists={personalSetlists}
        bands={manageableBands}
      />
    </div>
  );
}
