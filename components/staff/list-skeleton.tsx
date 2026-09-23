import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for a header plus a list of cards (staff and Avisos pages). */
export function CardListSkeleton({
  cards = 4,
  toolbar = true,
}: {
  cards?: number;
  toolbar?: boolean;
}) {
  return (
    <div className="w-full space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {toolbar && (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-9 w-40" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
