"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts is large and only needed below the fold: the staff overview
 * and Analytics load it on demand, in the browser, with a placeholder of
 * the same size meanwhile, instead of shipping it with every page's first
 * load. (A member's home overview is plain markup: see user-metrics.tsx.)
 */
function ChartsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export const LazyAdminMetricsCharts = dynamic(
  () => import("./admin-metrics").then((m) => m.AdminMetricsCharts),
  { ssr: false, loading: ChartsSkeleton },
);

function ChartSkeleton() {
  return <Skeleton className="h-64 rounded-xl" aria-hidden />;
}

export const LazyActivityChart = dynamic(
  () =>
    import("../analytics/_components/activity-chart").then(
      (m) => m.ActivityChart,
    ),
  { ssr: false, loading: ChartSkeleton },
);
