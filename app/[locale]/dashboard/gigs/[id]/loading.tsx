import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
  ListSkeleton,
} from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function GigDetailLoading() {
  return (
    <div className="w-full space-y-6">
      <BreadcrumbSkeleton crumbs={2} />
      <DetailHeaderSkeleton withDescription withMeta actions={2} />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <ListSkeleton rows={6} />
      </div>
    </div>
  );
}
