"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_STATUSES,
  type AnnouncementStatus,
} from "@/types/communication";

/** Status filter of the staff announcement list (`?status=`). */
export function StatusTabs({
  current,
}: {
  current: AnnouncementStatus | null;
}) {
  const t = useTranslations("announcements");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const values: (AnnouncementStatus | null)[] = [
    null,
    ...ANNOUNCEMENT_STATUSES,
  ];

  return (
    <div className="flex items-center gap-2">
      <div
        role="tablist"
        aria-label={t("admin.statusFilter")}
        className="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-1"
      >
        {values.map((value) => {
          const selected = value === current;
          return (
            <button
              key={value ?? "all"}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() =>
                startTransition(() =>
                  router.replace(
                    value ? `${pathname}?status=${value}` : pathname,
                    {
                      scroll: false,
                    },
                  ),
                )
              }
              className={cn(
                "focus-visible:ring-ring/50 inline-flex h-full items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:outline-none",
                selected && "bg-background text-foreground shadow-sm",
              )}
            >
              {value ? t(`status.${value}`) : t("admin.allStatuses")}
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
