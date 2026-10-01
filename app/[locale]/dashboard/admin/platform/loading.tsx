import { CardListSkeleton } from "@/components/staff/list-skeleton";

export default function PlatformSettingsLoading() {
  return <CardListSkeleton cards={3} toolbar={false} />;
}
