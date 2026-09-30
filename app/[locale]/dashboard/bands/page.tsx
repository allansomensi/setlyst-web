import { staticTitle } from "@/lib/page-metadata";
import { fetchAllServerPages, fetchServerApi } from "@/lib/api-server";
import { BandWithMembership, Gig, QuotaReport } from "@/types/api";
import { BandsGrid, type BandGigPreview } from "./_components/bands-grid";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";

export async function generateMetadata() {
  return staticTitle("bands");
}

/**
 * A band's shows that may still be ahead, soonest first: enough for the
 * card's "next show" line. Which one is next depends on the viewer's
 * clock (the card picks it after mount), so a day of slack is kept here
 * rather than cutting at the server's "now".
 */
function upcomingPreview(gigs: Gig[]): BandGigPreview[] {
  const wallClock = (offsetHours: number) =>
    new Date(Date.now() + offsetHours * 3_600_000).toISOString().slice(0, 19);
  const cutoff = wallClock(-36);
  // Upcoming for every viewer whatever their time zone (UTC+14 at most).
  const surelyUpcoming = wallClock(14);
  const sorted = gigs
    .filter((gig) => gig.status !== "cancelled" && gig.scheduled_at >= cutoff)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  // Everything up to the first show that is ahead for anyone: a fixed
  // "first 3" could be three shows from last night, hiding the real
  // next one (as on the dashboard's "next show" card).
  const first = sorted.findIndex((gig) => gig.scheduled_at >= surelyUpcoming);
  return sorted
    .slice(0, first === -1 ? sorted.length : first + 1)
    .slice(0, 10)
    .map(({ id, venue, scheduled_at }) => ({ id, venue, scheduled_at }));
}

export default async function BandsPage() {
  const [bandsResult, quotas] = await Promise.all([
    fetchOrFailed(fetchServerApi<BandWithMembership[]>("/bands")),
    // Only for the usage chip next to "New band": never fatal.
    fetchServerApi<QuotaReport>("/users/me/quotas").catch(() => null),
  ]);

  const hadError = bandsResult === FETCH_FAILED;
  const bands = hadError ? [] : bandsResult;

  // Each card says when the band plays next: the first thing a member
  // wants to know about a band. Only a nicety, so a failed list just
  // leaves that line off its card.
  const gigLists = await Promise.all(
    bands.map((band) =>
      fetchAllServerPages<Gig>(`/bands/${band.id}/gigs`).then(
        (res) => upcomingPreview(res.data ?? []),
        () => null,
      ),
    ),
  );
  const upcomingGigs: Record<string, BandGigPreview[]> = {};
  bands.forEach((band, index) => {
    const list = gigLists[index];
    if (list) upcomingGigs[band.id] = list;
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <BandsGrid
        initialBands={bands}
        loadError={hadError}
        quotas={quotas}
        upcomingGigs={upcomingGigs}
      />
    </div>
  );
}
