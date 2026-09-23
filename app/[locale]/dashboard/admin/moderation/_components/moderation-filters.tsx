"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { usePathname, useRouter } from "@/i18n/routing";
import { MODERATION_TABS, type ModerationTab } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import { MODERATION_TARGETS, type ModerationTarget } from "@/types/staff";

/**
 * Status tabs (Abertos / Resolvidos / Descartados), the type filter and,
 * when the queue is narrowed to one account (`?user_id=`), a chip that
 * says so and clears it.
 */
export function ModerationFilters({
  tab,
  type,
  openTotal,
  openByType,
  userFilter,
}: {
  tab: ModerationTab;
  type: ModerationTarget | null;
  openTotal: number | null;
  openByType: Partial<Record<ModerationTarget, number>>;
  userFilter: { id: string; username: string | null } | null;
}) {
  const t = useTranslations("moderation");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const go = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    );
  };

  return (
    <div className="space-y-3">
      {userFilter && (
        <div className="bg-primary/10 text-foreground inline-flex max-w-full items-center gap-2 rounded-full border py-1 pr-1 pl-3 text-sm">
          <UserRound className="text-primary size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {userFilter.username
              ? t("userFilter.label", { username: userFilter.username })
              : t("userFilter.unknown")}
          </span>
          <button
            type="button"
            onClick={() => go({ user_id: null })}
            className="hover:bg-background focus-visible:ring-ring/50 inline-flex size-6 shrink-0 items-center justify-center rounded-full focus-visible:ring-3 focus-visible:outline-none"
            aria-label={t("userFilter.clear")}
            title={t("userFilter.clear")}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div
          role="tablist"
          aria-label={t("tabsLabel")}
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-1"
        >
          {MODERATION_TABS.map((value) => {
            const selected = value === tab;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => go({ status: value === "open" ? null : value })}
                className={cn(
                  "focus-visible:ring-ring/50 inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:outline-none",
                  selected && "bg-background text-foreground shadow-sm",
                )}
              >
                {t(`tabs.${value}`)}
                {value === "open" && openTotal !== null && openTotal > 0 && (
                  <span className="bg-destructive/15 text-destructive rounded-full px-1.5 text-[11px] font-semibold tabular-nums">
                    {openTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <Loader2
              className="text-muted-foreground size-4 animate-spin"
              aria-hidden
            />
          )}
          <Label htmlFor="moderation-type" className="sr-only">
            {t("typeFilter")}
          </Label>
          <NativeSelect
            id="moderation-type"
            value={type ?? ""}
            onChange={(event) => go({ type: event.target.value || null })}
            wrapperClassName="sm:w-56"
            className="h-9"
          >
            <option value="">{t("types.all")}</option>
            {MODERATION_TARGETS.map((target) => (
              <option key={target} value={target}>
                {t(`types.${target}`)}
                {tab === "open" && openByType[target]
                  ? ` (${openByType[target]})`
                  : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
