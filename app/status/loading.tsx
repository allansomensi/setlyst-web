import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-neutral-950">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header Section */}
        <div className="relative mb-12 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="absolute top-0 right-0">
            {/* Refresh Status Button */}
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
          {/* Activity Icon */}
          <Skeleton className="h-12 w-12 rounded-xl" />
          {/* Title */}
          <Skeleton className="h-9 w-48" />
          {/* Subtitle */}
          <Skeleton className="h-5 w-80 max-w-xl" />
        </div>

        {/* Global Status Banner */}
        <Card className="border-l-4 border-l-neutral-200 dark:border-l-neutral-800">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-56" />
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Infrastructure Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-56" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="mt-2 h-4 w-72" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Core API Status */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <div>
                {/* Status Badge */}
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>

            <Separator />

            {/* Database Status */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Connection Pool (Hidden on Mobile) */}
                <Skeleton className="hidden h-4 w-28 sm:block" />
                {/* Status Badge */}
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex flex-col items-center justify-center space-y-2 pt-8">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    </div>
  );
}
