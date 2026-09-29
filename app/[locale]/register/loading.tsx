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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          {/* Logo */}
          <Skeleton className="mx-auto mb-2 size-14 rounded-xl" />
          {/* Title */}
          <Skeleton className="mx-auto h-8 w-1/2" />
          {/* Subtitle */}
          <Skeleton className="mx-auto h-4 w-3/4" />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Beta / e-mail confirmation notice */}
          <Skeleton className="h-24 w-full rounded-lg" />

          {/* "Continue with Google" + divider */}
          <Skeleton className="h-10 w-full" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-px flex-1" />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" /> {/* Label */}
            <Skeleton className="h-10 w-full" /> {/* Input */}
            <Skeleton className="h-3 w-3/5" /> {/* Hint */}
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" /> {/* Label */}
            <Skeleton className="h-10 w-full" /> {/* Input */}
            <Skeleton className="h-3 w-4/5" /> {/* Hint */}
          </div>

          {/* First & Last Name Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" /> {/* Label */}
              <Skeleton className="h-10 w-full" /> {/* Input */}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" /> {/* Label */}
              <Skeleton className="h-10 w-full" /> {/* Input */}
            </div>
          </div>

          {/* Password Field + requirements */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" /> {/* Label */}
            <Skeleton className="h-10 w-full" /> {/* Input */}
            <Skeleton className="h-1.5 w-full" /> {/* Strength meter */}
            <Skeleton className="h-16 w-2/3" /> {/* Checklist */}
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" /> {/* Label */}
            <Skeleton className="h-10 w-full" /> {/* Input */}
          </div>

          {/* Referral disclosure */}
          <Skeleton className="h-10 w-full rounded-lg" />

          {/* Consent checkboxes */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>

          {/* Submit Button */}
          <Skeleton className="mt-2 h-10 w-full" />
        </CardContent>

        <CardFooter className="flex justify-center border-t py-4">
          {/* Footer Text / Sign In Link */}
          <Skeleton className="h-4 w-4/5" />
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
