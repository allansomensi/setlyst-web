import { Skeleton } from "@/components/ui/skeleton";

export default function SupportLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="bg-card divide-y overflow-hidden rounded-xl border shadow-(--shadow-surface)">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <Skeleton className="mt-2 h-2 w-2 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-64 max-w-[80%]" />
              <Skeleton className="h-3 w-48 max-w-[60%]" />
            </div>
            <Skeleton className="h-5 w-24 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
