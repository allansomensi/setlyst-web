"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter } from "@/components/staff/date-range-filter";
import { useQueryParams } from "@/components/staff/list-controls";
import {
  USER_ROLE_FILTERS,
  USER_SORTS,
  USER_STATE_FILTERS,
} from "@/lib/console";

/**
 * The account list's filters and sort, kept in the URL (`?role=`,
 * `?state=`, `?verified=`, `?two_factor=`, `?created_from=`/`?created_to=`,
 * `?sort=`) and applied by the API. The search box above them is the
 * shared `ListToolbar`.
 */
export function UsersFilters() {
  const t = useTranslations("staff.users");
  const { searchParams, set, isPending } = useQueryParams();

  const select = (
    param: string,
    label: string,
    options: { value: string; label: string }[],
    fallback = "all",
  ) => (
    <Select
      value={searchParams.get(param) ?? fallback}
      onValueChange={(value) =>
        set({ [param]: value === fallback ? null : value })
      }
    >
      <SelectTrigger
        className="w-full min-w-0 sm:w-44"
        aria-label={label}
        title={label}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const yesNo = (key: "verified" | "twoFactor") =>
    (["all", "true", "false"] as const).map((value) => ({
      value,
      label: t(`filters.${key}.${value}`),
    }));

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      {select(
        "role",
        t("filterRole"),
        (["all", ...USER_ROLE_FILTERS] as const).map((value) => ({
          value,
          label: t(`roleFilter.${value}`),
        })),
      )}
      {select(
        "state",
        t("filterState"),
        (["all", ...USER_STATE_FILTERS] as const).map((value) => ({
          value,
          label: t(`stateFilter.${value}`),
        })),
      )}
      {select("verified", t("filters.verified.label"), yesNo("verified"))}
      {select("two_factor", t("filters.twoFactor.label"), yesNo("twoFactor"))}
      <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-1">
        <span className="text-muted-foreground shrink-0 text-sm">
          {t("filters.created")}
        </span>
        <DateRangeFilter
          fromParam="created_from"
          toParam="created_to"
          className="min-w-0 flex-1 sm:flex-none"
        />
      </div>
      <div className="col-span-2 sm:col-span-1 sm:ml-auto">
        {select(
          "sort",
          t("filters.sort.label"),
          USER_SORTS.map((value) => ({
            value,
            label: t(`filters.sort.${value}`),
          })),
          "username",
        )}
      </div>
      {isPending && (
        <Loader2
          className="text-muted-foreground h-4 w-4 animate-spin"
          aria-hidden
        />
      )}
    </div>
  );
}
