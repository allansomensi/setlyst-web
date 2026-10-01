import { Skeleton } from "@/components/ui/skeleton";

export default function IncidentLoading() {
  return (
    <div className="w-full space-y-6" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-2/3 max-w-lg" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
