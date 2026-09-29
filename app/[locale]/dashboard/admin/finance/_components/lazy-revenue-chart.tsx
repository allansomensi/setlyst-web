"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts on demand, in the browser, with a placeholder of the chart's
 * size meanwhile (see dashboard/_components/lazy-charts.tsx), so the rest
 * of the page is interactive without waiting for it.
 */
export const LazyRevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 rounded-xl" aria-hidden />,
  },
);
