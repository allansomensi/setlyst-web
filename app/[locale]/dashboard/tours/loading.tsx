import { Skeleton } from "@/components/ui/skeleton";

export default function ToursLoading() {
  return (
    <div className="w-full space-y-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
