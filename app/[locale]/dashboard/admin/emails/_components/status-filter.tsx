"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryParams } from "@/components/staff/list-controls";
import { cn } from "@/lib/utils";
import { OUTBOX_STATUSES, type OutboxStatus } from "@/types/operations";

/** One-of status filter of the outbox (`?status=`), as toggle chips. */
export function EmailStatusFilter({
  current,
}: {
  current: OutboxStatus | null;
}) {
  const t = useTranslations("emailsAdmin");
  const { set, isPending } = useQueryParams();
  const values: (OutboxStatus | null)[] = [null, ...OUTBOX_STATUSES];

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label={t("filters.status")}
        className="flex flex-wrap gap-1.5"
      >
        {values.map((value) => {
          const selected = value === current;
          return (
            <button
              key={value ?? "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => set({ status: value })}
              className={cn(
                "focus-visible:ring-ring/50 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3",
                selected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {selected && <Check className="size-3.5" aria-hidden />}
              {value ? t(`statuses.${value}`) : t("filters.allStatuses")}
            </button>
          );
        })}
      </div>
      {isPending && (
        <Loader2
          className="text-muted-foreground size-4 animate-spin"
          aria-hidden
        />
      )}
    </div>
  );
}
