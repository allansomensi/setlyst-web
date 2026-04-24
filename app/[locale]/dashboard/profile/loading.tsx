import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" /> {/* Title */}
        <Skeleton className="h-4 w-full max-w-md" /> {/* Subtitle */}
      </div>

      <Separator />

      <div className="flex flex-col gap-8">
        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          {/* Avatar & Role Skeleton */}
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Form Card Skeleton */}
          <Card className="md:bg-card border-none bg-transparent shadow-none md:border md:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <Skeleton className="h-6 w-32" /> {/* Card Title */}
              <Skeleton className="h-9 w-28" /> {/* Edit Button */}
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" /> {/* Label */}
                  <Skeleton className="h-10 w-full" /> {/* Input */}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" /> {/* Label */}
                  <Skeleton className="h-10 w-full" /> {/* Input */}
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-24" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-24" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info Skeleton */}
        <div className="flex items-center justify-center pt-6">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}
