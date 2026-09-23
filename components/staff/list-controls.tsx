"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/routing";

const DEBOUNCE_MS = 300;

/** Updates query-string params (resetting `page`) without a full reload. */
function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const set = (changes: Record<string, string | null>, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    if (resetPage) params.delete("page");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  };

  return { searchParams, set, isPending };
}

export interface ListFilter {
  param: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * Search box (debounced, kept in `?q=`) plus optional select filters for
 * the staff listings, which are paginated server-side.
 */
export function ListToolbar({
  placeholder,
  filters = [],
}: {
  placeholder: string;
  filters?: ListFilter[];
}) {
  const { searchParams, set, isPending } = useQueryParams();
  const initial = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);

  useEffect(() => {
    if (query === initial) return;
    const timer = setTimeout(
      () => set({ q: query.trim() || null }),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
        className="sm:max-w-sm"
      />
      {filters.map((filter) => (
        <Select
          key={filter.param}
          value={searchParams.get(filter.param) ?? "all"}
          onValueChange={(value) =>
            set({ [filter.param]: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-full sm:w-48" aria-label={filter.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {isPending && (
        <Loader2
          className="text-muted-foreground h-4 w-4 animate-spin"
          aria-hidden
        />
      )}
    </div>
  );
}

/** Previous/next pagination driven by `?page=`. */
export function ListPagination({
  page,
  totalPages,
  totalItems,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
}) {
  const t = useTranslations("common");
  const tStaff = useTranslations("staff.lists");
  const { set, isPending } = useQueryParams();

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {tStaff("total", { count: totalItems })}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => set({ page: String(page - 1) }, false)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("previous")}
          </Button>
          <span className="text-muted-foreground tabular-nums">
            {t("pageOf", { page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => set({ page: String(page + 1) }, false)}
          >
            {t("next")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
