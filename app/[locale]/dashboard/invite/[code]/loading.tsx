import { Skeleton } from "@/components/ui/skeleton";

export default function InviteLoading() {
  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center justify-center space-y-6 py-16"
      aria-hidden
    >
      <div className="bg-card w-full space-y-4 rounded-xl border p-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-16 rounded-xl" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
