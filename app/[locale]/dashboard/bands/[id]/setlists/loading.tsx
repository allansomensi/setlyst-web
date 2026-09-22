import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
  TableSkeleton,
} from "@/components/page-skeletons";

export default function BandSetlistsLoading() {
  return (
    <div className="w-full space-y-6">
      <BreadcrumbSkeleton crumbs={3} />
      <DetailHeaderSkeleton />
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}
