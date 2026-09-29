"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";
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

  // Links in a <nav>, not a tablist: each one changes the URL (so it can be
  // opened in a new tab or bookmarked), and the ARIA tab pattern would
  // promise arrow-key behaviour these don't have. A plain click still runs
  // inside a transition, for the spinner.
  return (
    <div className="flex items-center gap-2">
      <nav
        aria-label={t("admin.statusFilter")}
        className="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full min-w-0 items-center overflow-x-auto rounded-lg p-1"
      >
        {values.map((value) => {
          const selected = value === current;
          const href = value ? `${pathname}?status=${value}` : pathname;
          return (
            <Link
              key={value ?? "all"}
              href={href}
              replace
              scroll={false}
              aria-current={selected ? "page" : undefined}
              onNavigate={(event) => {
                event.preventDefault();
                startTransition(() => router.replace(href, { scroll: false }));
              }}
              className={cn(
                "focus-visible:ring-ring/50 inline-flex h-full items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:outline-none",
                selected && "bg-background text-foreground shadow-sm",
              )}
            >
              {value ? t(`status.${value}`) : t("admin.allStatuses")}
            </Link>
          );
        })}
      </nav>
      {isPending && (
        <Loader2
          className="text-muted-foreground size-4 animate-spin"
          aria-hidden
        />
      )}
    </div>
  );
}
