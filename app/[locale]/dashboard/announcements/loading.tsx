import { CardListSkeleton } from "@/components/staff/list-skeleton";

export default function AnnouncementsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <CardListSkeleton cards={3} />
    </div>
  );
}
