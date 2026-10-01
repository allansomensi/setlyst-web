import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
} from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function SupportTicketLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <BreadcrumbSkeleton crumbs={2} />
      <DetailHeaderSkeleton withMeta actions={1} />
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="space-y-4">
        {/* Alternating sides, like the conversation itself. */}
        {[false, true, false].map((mine, i) => (
          <div key={i} className={cn("flex gap-3", mine && "flex-row-reverse")}>
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-20 w-3/4 rounded-2xl sm:w-2/3" />
          </div>
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
