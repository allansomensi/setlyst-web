import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
} from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** A ticket while it loads: the thread on the left, the side panel right. */
export default function SupportTicketLoading() {
  return (
    <div className="w-full space-y-6" aria-busy="true">
      <BreadcrumbSkeleton crumbs={2} />
      <DetailHeaderSkeleton withDescription withMeta />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <div className="bg-card space-y-4 rounded-xl border p-6">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={i % 2 === 1 ? "flex gap-3 sm:ml-8" : "flex gap-3"}
              >
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 rounded-xl border p-4">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-card space-y-3 rounded-xl border p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="ml-auto h-9 w-32" />
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card space-y-3 rounded-xl border p-6">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
