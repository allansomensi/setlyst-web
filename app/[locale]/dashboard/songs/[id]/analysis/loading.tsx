import { Skeleton } from "@/components/ui/skeleton";

export default function SongAnalysisLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <Skeleton className="h-4 w-64" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[32rem] w-full rounded-xl" />
        <Skeleton className="hidden h-[24rem] w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}
