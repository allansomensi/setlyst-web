"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[DashboardError]", error);
    }
  }, [error]);

  const userMessage =
    process.env.NODE_ENV === "production"
      ? "We couldn't load the requested information. Please try again."
      : error.message || "An unexpected error occurred.";

  const digest =
    process.env.NODE_ENV === "production" ? error.digest : undefined;

  return (
    <div className="animate-in fade-in-50 flex h-[50vh] w-full flex-col items-center justify-center space-y-4 rounded-md border border-dashed p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        Oops! Something went wrong.
      </h2>
      <p className="text-muted-foreground max-w-sm">{userMessage}</p>
      {digest && (
        <p className="text-muted-foreground text-xs">
          Reference: <code className="font-mono">{digest}</code>
        </p>
      )}
      <Button variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
