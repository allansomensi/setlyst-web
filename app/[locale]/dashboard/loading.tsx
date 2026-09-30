import { Skeleton } from "@/components/ui/skeleton";

// Same frame as the home page (page.tsx): title, shortcuts (phones only),
// then the overview: the numbers panel and three cards.
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 pb-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 sm:h-9" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      <div className="space-y-3 md:hidden">
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-15 rounded-xl sm:h-16" />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-41 rounded-xl sm:h-20" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl md:col-span-2 lg:col-span-1" />
        </div>
      </div>
    </div>
  );
}
