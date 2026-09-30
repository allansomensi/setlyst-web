import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/components/auth/auth-shell";

// Inside the same frame as the page (header, footer, card width), so
// nothing jumps when the form arrives.
export default function Loading() {
  return (
    <AuthShell>
      <Card size="lg" className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          {/* Logo */}
          <Skeleton className="mx-auto mb-2 size-14 rounded-xl" />
          {/* Title */}
          <Skeleton className="mx-auto h-8 w-1/2" />
          {/* Subtitle */}
          <Skeleton className="mx-auto h-4 w-3/4" />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* "Continue with Google" + divider */}
          <Skeleton className="h-10 w-full" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-px flex-1" />
          </div>

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
    </AuthShell>
  );
}
