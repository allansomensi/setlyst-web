import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbSkeleton } from "@/components/page-skeletons";

export default function AboutLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <BreadcrumbSkeleton />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
