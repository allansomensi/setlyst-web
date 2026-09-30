import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/routing";

/**
 * The empty state of a staff listing: the app's `EmptyState` (icon, title,
 * next step) instead of a bare grey line. When a search or filter is what
 * emptied the list, it says so with a "no results" icon and offers to
 * clear them, so a narrowed list never reads as "there is nothing".
 *
 * Hook-only (no `async`), so it renders from server pages and client
 * components alike.
 */
export function ListEmptyState({
  icon,
  title,
  description,
  filtered = false,
  clearHref,
  onClear,
  actions,
  compact = true,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** A search or filter is active. */
  filtered?: boolean;
  /** Where "clear filters" goes (server-side lists). */
  clearHref?: string;
  /** Or what it does (client-side lists). */
  onClear?: () => void;
  /** The next step when nothing is filtered (usually "create"). */
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("staff.lists");
  const clear =
    filtered && clearHref ? (
      <Button variant="outline" size="sm" asChild>
        <Link href={clearHref} scroll={false}>
          {t("clearAll")}
        </Link>
      </Button>
    ) : filtered && onClear ? (
      <Button variant="outline" size="sm" onClick={onClear}>
        {t("clearAll")}
      </Button>
    ) : null;

  return (
    <EmptyState
      compact={compact}
      icon={filtered ? SearchX : icon}
      title={title}
      description={description}
      actions={filtered ? clear : actions}
      className={className}
    />
  );
}

/** Whether a staff listing's URL narrows it (anything but `?page=`). */
export function hasListFilters(
  params: Record<string, string | string[] | undefined>,
): boolean {
  return Object.entries(params).some(
    ([key, value]) => key !== "page" && value !== undefined && value !== "",
  );
}
