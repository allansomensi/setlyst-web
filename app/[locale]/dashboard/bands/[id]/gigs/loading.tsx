import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
  TableSkeleton,
} from "@/components/page-skeletons";

export default function BandGigsLoading() {
  return (
    <div className="w-full space-y-6">
      <BreadcrumbSkeleton crumbs={3} />
      <DetailHeaderSkeleton />
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}
