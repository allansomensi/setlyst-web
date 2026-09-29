import { LiveModeSkeleton } from "@/components/page-skeletons";

export default function SongLiveLoading() {
  // The single-song viewer has no prev/next footer.
  return <LiveModeSkeleton footer={false} />;
}
