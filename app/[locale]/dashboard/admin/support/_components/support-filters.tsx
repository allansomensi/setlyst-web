"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";
import { ChoiceChips } from "@/components/staff/choice-chips";
import { ListToolbar, useQueryParams } from "@/components/staff/list-controls";
import { usePathname, useRouter } from "@/i18n/routing";
import {
  ASSIGNEE_FILTERS,
  DEFAULT_TICKET_TAB,
  type AssigneeFilter,
} from "@/lib/support-admin";
import { cn } from "@/lib/utils";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_TABS,
  type TicketTab,
} from "@/types/operations";

/**
 * The inbox's status tabs (with their counts), the search box, the
 * priority and category filters and the "assigned to me" / "unassigned"
 * quick filters. Everything lives in the URL, so a filtered inbox can be
 * bookmarked or shared ("mine" means whoever opens it).
 */
export function SupportFilters({
  tab,
  assignee,
  counts,
}: {
  tab: TicketTab;
  assignee: AssigneeFilter | null;
  /** Tickets per tab, when the summary loaded. */
  counts: Partial<Record<TicketTab, number>> | null;
}) {
  const t = useTranslations("supportAdmin");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { set } = useQueryParams();

  const hrefWith = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const go = (changes: Record<string, string | null>) => {
    const href = hrefWith(changes);
    startTransition(() => router.replace(href, { scroll: false }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {/* Links in a <nav>, not a tablist, like the moderation queue: each
            one changes the URL, and the ARIA tab pattern would promise
            arrow-key behaviour these don't have. */}
        <nav
          aria-label={t("tabsLabel")}
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-1"
        >
          {TICKET_TABS.map((value) => {
            const selected = value === tab;
            const status = {
              status: value === DEFAULT_TICKET_TAB ? null : value,
            };
            const count = counts?.[value];
            return (
              <Link
                key={value}
                href={hrefWith(status)}
                replace
                scroll={false}
                aria-current={selected ? "page" : undefined}
                onNavigate={(event) => {
                  event.preventDefault();
                  go(status);
                }}
                className={cn(
                  "focus-visible:ring-ring/50 inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:outline-none",
                  selected && "bg-background text-foreground shadow-sm",
                )}
              >
                {t(`tabs.${value}`)}
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                      value === "open"
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                        : "bg-foreground/10",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {isPending && (
          <Loader2
            className="text-muted-foreground size-4 shrink-0 animate-spin"
            aria-hidden
          />
        )}
      </div>

      <ListToolbar
        placeholder={t("search")}
        filters={[
          {
            param: "priority",
            label: t("filters.priority"),
            options: [
              { value: "all", label: t("filters.anyPriority") },
              ...TICKET_PRIORITIES.map((value) => ({
                value,
                label: t(`priority.${value}`),
              })),
            ],
          },
          {
            param: "category",
            label: t("filters.category"),
            options: [
              { value: "all", label: t("filters.anyCategory") },
              ...TICKET_CATEGORIES.map((value) => ({
                value,
                label: t(`category.${value}`),
              })),
            ],
          },
        ]}
      />

      {/* One choice at a time: picking "unassigned" drops "mine". */}
      <ChoiceChips
        label={t("filters.assignee")}
        options={ASSIGNEE_FILTERS.map((value) => ({
          value,
          label: t(`filters.assigneeOptions.${value}`),
        }))}
        value={assignee ? [assignee] : []}
        onChange={(next) => {
          const added = next.find((value) => value !== assignee);
          set({ assignee: added ?? null });
        }}
      />
    </div>
  );
}
