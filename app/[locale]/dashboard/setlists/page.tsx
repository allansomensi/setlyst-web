import { fetchServerApi, fetchAllServerPages } from "@/lib/api-server";
import { Setlist, BandWithMembership, BAND_ROLE_LEVEL } from "@/types/api";
import { SetlistsTable } from "./_components/setlists-table";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";

export default async function SetlistsPage() {
  // Personal setlists and the band list are independent sources — each
  // goes through fetchOrFailed so one failing (a transient rate limit,
  // timeout) shouldn't take the whole page down when the other still has
  // something real to show. An empty `setlists` array caused by a failed
  // fetch must NOT be rendered as the normal "no setlists yet" empty
  // state — the person does have setlists, this fetch just didn't get
  // them this time (see <LoadErrorNotice />, which SetlistsTable shows
  // instead when `loadError` is true and the list ends up empty).
  const [personalRes, bandsRaw] = await Promise.all([
    fetchOrFailed(fetchAllServerPages<Setlist>("/setlists")),
    fetchOrFailed(fetchServerApi<BandWithMembership[]>("/bands")),
  ]);

  const personalFailed = personalRes === FETCH_FAILED;
  const bandsFailed = bandsRaw === FETCH_FAILED;
  const personalSetlists = personalFailed ? [] : (personalRes?.data ?? []);
  const bands = bandsFailed ? [] : bandsRaw;

  const bandsById: Record<string, { name: string; canManage: boolean }> = {};
  for (const band of bands) {
    const canManage =
      BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.moderator ||
      (band.my_role === "member" && band.members_can_manage_setlists);
    bandsById[band.id] = { name: band.name, canManage };
  }

  // Same reasoning per band: one band's setlists failing to load
  // shouldn't hide every other band's (or the personal ones).
  const bandSetlistsResults = await Promise.all(
    bands.map((band) =>
      fetchOrFailed(fetchAllServerPages<Setlist>(`/bands/${band.id}/setlists`)),
    ),
  );
  const bandSetlistsFailed = bandSetlistsResults.some(
    (res) => res === FETCH_FAILED,
  );
  const bandSetlists = bandSetlistsResults.flatMap((res) =>
    res === FETCH_FAILED ? [] : (res?.data ?? []),
  );

  const setlists = [...personalSetlists, ...bandSetlists];
  const hadError = personalFailed || bandsFailed || bandSetlistsFailed;

  return (
    <div className="w-full space-y-4">
      <SetlistsTable
        initialSetlists={setlists}
        bandsById={bandsById}
        loadError={hadError}
      />
    </div>
  );
}
