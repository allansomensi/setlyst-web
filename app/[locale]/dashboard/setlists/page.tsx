import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Setlist } from "@/types/api";
import { SetlistsTable } from "./_components/setlists-table";

export default async function SetlistsPage() {
  const setlistsRes = await fetchServerApi<PaginatedResponse<Setlist>>(
    "/setlists?page=1&per_page=100",
  );

  const setlists = setlistsRes.data || [];

  return (
    <div className="w-full space-y-4">
      <SetlistsTable initialSetlists={setlists} />
    </div>
  );
}
