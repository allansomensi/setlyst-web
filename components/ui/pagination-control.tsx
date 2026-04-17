"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
}

function PaginationControlInner({
  currentPage,
  totalPages,
}: PaginationControlProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-end space-x-2 py-4"
    >
      <div className="text-muted-foreground mr-4 text-sm">
        Page {currentPage} of {totalPages}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(createPageURL(currentPage - 1))}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(createPageURL(currentPage + 1))}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
      >
        Next <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </nav>
  );
}

export function PaginationControl(props: PaginationControlProps) {
  return (
    <Suspense fallback={null}>
      <PaginationControlInner {...props} />
    </Suspense>
  );
}
