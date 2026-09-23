"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser's print dialog (the legal pages have print styles). */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer />
      {label}
    </Button>
  );
}
