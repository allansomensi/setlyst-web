import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
  ListSkeleton,
} from "@/components/page-skeletons";

export default function BandDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-6">
        <BreadcrumbSkeleton crumbs={2} />
        <DetailHeaderSkeleton withDescription actions={2} />
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <ListSkeleton rows={4} leading="avatar" />
      </div>
    </div>
  );
}
