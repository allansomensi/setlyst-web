import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" /> {/* Title */}
        <Skeleton className="h-4 w-full max-w-md" /> {/* Description */}
      </div>

      {/* General Card */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-24" /> {/* Card title */}
          <Skeleton className="h-4 w-56" /> {/* Card description */}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-20" /> {/* Label */}
              <Skeleton className="h-10 w-full" /> {/* Select Input */}
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-16" /> {/* Label */}
              <Skeleton className="h-10 w-full" /> {/* Select Input */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Mode Font Size Card */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40" /> {/* Card title */}
          <Skeleton className="h-4 w-64" /> {/* Card description */}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-12 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-full sm:max-w-[12rem]" />
        </CardContent>
        <CardFooter className="justify-end">
          <Skeleton className="h-10 w-full sm:w-28" /> {/* Save Button */}
        </CardFooter>
      </Card>

      {/* Backup Card */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-32" /> {/* Card title */}
          <Skeleton className="h-4 w-72" /> {/* Card description */}
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
