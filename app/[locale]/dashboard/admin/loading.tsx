import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/page-skeletons";

/**
 * Fallback for the staff pages without a loading state of their own
 * (audit, bands, songs, setlists, limits, links): mostly a title, a
 * filter row and a table.
 */
export default function AdminLoading() {
  return (
    <div className="w-full space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-9 w-72 max-w-full" />
      <TableSkeleton rows={8} />
    </div>
  );
}
