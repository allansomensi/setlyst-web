import { Skeleton } from "@/components/ui/skeleton";
import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
} from "@/components/page-skeletons";

export default function SetlistAnalyticsLoading() {
  return (
    <div className="w-full space-y-6">
      <BreadcrumbSkeleton crumbs={3} />
      <DetailHeaderSkeleton />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-xl border p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-card space-y-4 rounded-xl border p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
