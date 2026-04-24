import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          {/* Title */}
          <Skeleton className="mx-auto h-8 w-1/2" />
          {/* Subtitle */}
          <Skeleton className="mx-auto h-4 w-3/4" />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Username Field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" /> {/* Label */}
            <Skeleton className="h-10 w-full" /> {/* Input */}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" /> {/* Label */}
              <Skeleton className="h-4 w-32" /> {/* Forgot Password Link */}
            </div>
            <Skeleton className="h-10 w-full" /> {/* Input */}
          </div>

          {/* Submit Button */}
          <Skeleton className="mt-2 h-10 w-full" />
        </CardContent>

        <CardFooter className="flex justify-center border-t py-4">
          {/* Footer Text / Sign Up Link */}
          <Skeleton className="h-4 w-4/5" />
        </CardFooter>
      </Card>
    </div>
  );
}
