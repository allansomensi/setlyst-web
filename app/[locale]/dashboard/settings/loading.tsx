import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" /> {/* Title */}
        <Skeleton className="h-4 w-full max-w-md" /> {/* Description */}
      </div>

      <Separator />

      <div className="mx-auto w-full max-w-3xl px-4 sm:px-0">
        <Card className="md:bg-card border-none bg-transparent shadow-none md:border md:shadow-sm">
          <CardContent className="space-y-6 p-2 sm:space-y-8 sm:p-6 md:p-8">
            {/* Grid for Language and Theme */}
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

            {/* Font Size Input */}
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-32" /> {/* Label */}
              <Skeleton className="h-10 w-full sm:max-w-[16rem]" />{" "}
              {/* Number Input */}
              <Skeleton className="h-3 w-64" /> {/* Help text */}
            </div>
          </CardContent>

          <CardFooter className="bg-muted/30 flex justify-end rounded-b-lg p-4 pt-6 md:border-t md:px-8 md:py-6">
            <Skeleton className="h-10 w-full sm:w-28" /> {/* Save Button */}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
