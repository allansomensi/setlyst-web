import { fetchServerApi } from "@/lib/api-server";
import { BandWithMembership } from "@/types/api";
import { BandsGrid } from "./_components/bands-grid";

export default async function BandsPage() {
  const bands = await fetchServerApi<BandWithMembership[]>("/bands");

  return (
    <div className="w-full space-y-4">
      <BandsGrid initialBands={bands ?? []} />
    </div>
  );
}
