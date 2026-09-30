import {
  BreadcrumbSkeleton,
  DetailHeaderSkeleton,
  TableSkeleton,
} from "@/components/page-skeletons";

export default function BandSetlistsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <BreadcrumbSkeleton crumbs={3} />
      <DetailHeaderSkeleton />
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}
