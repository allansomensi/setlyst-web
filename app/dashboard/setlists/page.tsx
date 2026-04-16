import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Setlist } from "@/types/api";
import { SetlistsTable } from "./_components/setlists-table";
import { PaginationControl } from "@/components/ui/pagination-control";

export default async function SetlistsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Number(params?.page) || 1;
  const perPage = 10;

  const setlistsRes = await fetchServerApi<PaginatedResponse<Setlist>>(
    `/setlists?page=${currentPage}&per_page=${perPage}`,
  );

  const setlists = setlistsRes.data || [];
  const meta = setlistsRes.meta;

  return (
    <div className="w-full space-y-4">
      <SetlistsTable initialSetlists={setlists} />
      {meta && meta.total_pages > 1 && (
        <PaginationControl
          currentPage={meta.current_page}
          totalPages={meta.total_pages}
        />
      )}
    </div>
  );
}
