import { Skeleton } from "@/components/ui/skeleton";

export default function TrashLoading() {
  return (
    <div className="w-full space-y-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-9 w-72" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
