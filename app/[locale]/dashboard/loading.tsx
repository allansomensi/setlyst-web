import { Skeleton } from "@/components/ui/skeleton";

// Same frame as the home page (page.tsx): title, shortcuts grid, charts.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 sm:h-9" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-15 rounded-xl sm:h-16" />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-100 rounded-xl" />
          <Skeleton className="h-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
