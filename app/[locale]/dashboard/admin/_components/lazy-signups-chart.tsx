"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts on demand, in the browser, with a placeholder of the chart's
 * size meanwhile (see dashboard/_components/lazy-charts.tsx), so the rest
 * of the overview is interactive without waiting for it.
 */
export const LazySignupsChart = dynamic(
  () => import("./signups-chart").then((m) => m.SignupsChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 rounded-xl" aria-hidden />,
  },
);
