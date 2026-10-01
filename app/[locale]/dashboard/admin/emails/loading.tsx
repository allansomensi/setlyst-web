import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/page-skeletons";

export default function EmailsLoading() {
  return (
    <div className="w-full space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <Skeleton className="h-9 w-72 max-w-full" />
      <TableSkeleton rows={8} />
    </div>
  );
}
