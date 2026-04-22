"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  setCurrentPage,
}: TablePaginationProps) {
  const t = useTranslations("pagination");

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage(currentPage - 1)}
        disabled={currentPage === 1}
      >
        {t("previous")}
      </Button>
      <div className="text-muted-foreground text-sm font-medium">
        {t("page", { current: currentPage, total: totalPages })}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        {t("next")}
      </Button>
    </div>
  );
}
