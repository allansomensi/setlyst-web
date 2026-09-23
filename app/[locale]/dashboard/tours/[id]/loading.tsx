import { Skeleton } from "@/components/ui/skeleton";

export default function TourLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Skeleton className="h-4 w-60" />
      <Skeleton className="h-10 w-2/3" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
