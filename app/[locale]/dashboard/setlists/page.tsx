import { fetchServerApi } from "@/lib/api-server";
import {
  PaginatedResponse,
  Setlist,
  BandWithMembership,
  BAND_ROLE_LEVEL,
} from "@/types/api";
import { SetlistsTable } from "./_components/setlists-table";

export default async function SetlistsPage() {
  const [personalRes, bands] = await Promise.all([
    fetchServerApi<PaginatedResponse<Setlist>>("/setlists?page=1&per_page=100"),
    fetchServerApi<BandWithMembership[]>("/bands"),
  ]);

  const personalSetlists = personalRes.data || [];

  const bandsById: Record<string, { name: string; canManage: boolean }> = {};
  for (const band of bands) {
    const canManage =
      BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.moderator ||
      (band.my_role === "member" && band.members_can_manage_setlists);
    bandsById[band.id] = { name: band.name, canManage };
  }

  const bandSetlistsResults = await Promise.all(
    bands.map((band) =>
      fetchServerApi<PaginatedResponse<Setlist>>(
        `/bands/${band.id}/setlists?page=1&per_page=100`,
      ),
    ),
  );
  const bandSetlists = bandSetlistsResults.flatMap((res) => res.data || []);

  const setlists = [...personalSetlists, ...bandSetlists];

  return (
    <div className="w-full space-y-4">
      <SetlistsTable initialSetlists={setlists} bandsById={bandsById} />
    </div>
  );
}
