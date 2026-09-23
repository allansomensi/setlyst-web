import { staticTitle } from "@/lib/page-metadata";
import { fetchServerApi } from "@/lib/api-server";
import { BandWithMembership } from "@/types/api";
import { BandsGrid } from "./_components/bands-grid";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";

export async function generateMetadata() {
  return staticTitle("bands");
}

export default async function BandsPage() {
  const bandsResult = await fetchOrFailed(
    fetchServerApi<BandWithMembership[]>("/bands"),
  );

  const hadError = bandsResult === FETCH_FAILED;
  const bands = hadError ? [] : bandsResult;

  return (
    <div className="w-full space-y-4">
      <BandsGrid initialBands={bands} loadError={hadError} />
    </div>
  );
}
