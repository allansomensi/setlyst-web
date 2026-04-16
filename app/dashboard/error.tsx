"use client";

import { useEffect } from "react";
import { toast } from "sonner";
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
    toast.error(error.message || "An unexpected error occurred.", {
      id: "global-dashboard-error",
    });
  }, [error]);

  return (
    <div className="animate-in fade-in-50 flex h-[50vh] w-full flex-col items-center justify-center space-y-4 rounded-md border border-dashed p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        Oops! Something went wrong.
      </h2>
      <p className="text-muted-foreground max-w-sm">
        {error.message || "We couldn't load the requested information."}
      </p>
      <Button variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
