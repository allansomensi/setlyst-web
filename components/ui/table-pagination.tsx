"use client";

import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/hooks/use-page-size";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  totalItems: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  /** The active search, echoed in the summary ("… for 'x'"). */
  search?: string;
  className?: string;
}

type PageItem = number | "gap-start" | "gap-end";

/**
 * Which page buttons to show: always the first and last, the current page
 * with one neighbour either side, and an ellipsis for anything skipped —
 * `1 … 4 [5] 6 … 20`. Short ranges are shown in full. The list keeps a
 * constant length once it's truncated, so the buttons don't shift under
 * the pointer as you click through.
 */
function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  if (current <= 4) return [1, 2, 3, 4, 5, "gap-end", total];
  if (current >= total - 3)
    return [1, "gap-start", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "gap-start", current - 1, current, current + 1, "gap-end", total];
}

/**
 * Footer for every paginated list: where you are ("26–50 of 148"), how
 * many rows per page, and direct access to any page.
 *
 * Replaces a bare Previous / "Page 3 of 15" / Next, which made reaching
 * something on page 12 a matter of eleven clicks. On phones the numbered
 * buttons give way to a page picker, which is one tap to open and one to
 * land anywhere.
 */
export function TablePagination({
  currentPage,
  totalPages,
  setCurrentPage,
  totalItems,
  pageSize,
  setPageSize,
  search,
  className,
}: TablePaginationProps) {
  const t = useTranslations("pagination");

  const first = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(totalItems, currentPage * pageSize);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:justify-start">
        <p aria-live="polite">
          {t("range", { first, last, total: totalItems })}
          {search?.trim() && (
            <span className="hidden sm:inline">
              {" "}
              {t("forSearch", { search: search.trim() })}
            </span>
          )}
        </p>

        {totalItems > PAGE_SIZE_OPTIONS[0] && (
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">{t("perPage")}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label={t("label")} className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={() => setCurrentPage(1)}
            disabled={!canPrev}
            aria-label={t("first")}
            title={t("first")}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="size-9 sm:size-7"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={!canPrev}
            aria-label={t("previous")}
            title={t("previous")}
          >
            <ChevronLeft />
          </Button>

          {/* Phones: one picker instead of a row of tiny targets. */}
          <Select
            value={String(currentPage)}
            onValueChange={(value) => setCurrentPage(Number(value))}
          >
            <SelectTrigger
              className="h-9 min-w-28 justify-center gap-1.5 sm:hidden"
              aria-label={t("jumpTo")}
            >
              <SelectValue>
                {t("page", { current: currentPage, total: totalPages })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <SelectItem key={page} value={String(page)}>
                    {t("page", { current: page, total: totalPages })}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          <div className="hidden items-center gap-1 sm:flex">
            {pageItems(currentPage, totalPages).map((item) =>
              typeof item === "number" ? (
                <Button
                  key={item}
                  variant={item === currentPage ? "default" : "ghost"}
                  size="sm"
                  className="h-7 min-w-7 px-2 font-mono text-xs tabular-nums"
                  onClick={() => setCurrentPage(item)}
                  aria-label={t("goTo", { page: item })}
                  aria-current={item === currentPage ? "page" : undefined}
                >
                  {item}
                </Button>
              ) : (
                <span
                  key={item}
                  aria-hidden
                  className="text-muted-foreground w-5 text-center text-xs select-none"
                >
                  …
                </span>
              ),
            )}
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            className="size-9 sm:size-7"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!canNext}
            aria-label={t("next")}
            title={t("next")}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={() => setCurrentPage(totalPages)}
            disabled={!canNext}
            aria-label={t("last")}
            title={t("last")}
          >
            <ChevronsRight />
          </Button>
        </nav>
      )}
    </div>
  );
}
