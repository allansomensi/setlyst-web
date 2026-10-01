import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/page-skeletons";

/** The inbox while it loads: title, the KPI panel, the filters, a table. */
export default function SupportInboxLoading() {
  return (
    <div className="w-full space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card space-y-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-48" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
