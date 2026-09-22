import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
  ListSkeleton,
} from "@/components/page-skeletons";

export default function SetlistDetailLoading() {
  return (
    <div className="w-full space-y-6">
      <BreadcrumbSkeleton crumbs={2} />
      <DetailHeaderSkeleton withDescription withMeta actions={2} />
      <ListSkeleton rows={8} />
    </div>
  );
}
