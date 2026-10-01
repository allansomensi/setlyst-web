import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Flame, MessageCircleMore } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketPriority, TicketStatus } from "@/types/operations";

/**
 * Status and priority badges of the support inbox and the ticket page.
 * Hook-only (no `async`, no "use client"), so they render from server
 * pages and client components alike.
 *
 * Status colours follow who has the next move: amber when the staff owe
 * an answer (`open`), sky while the requester does (`pending`), green once
 * it's solved, neutral when closed.
 */
const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  pending: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  resolved:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  closed: "border-border bg-secondary text-secondary-foreground",
};

export function TicketStatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const t = useTranslations("supportAdmin.status");
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {t(status)}
    </Badge>
  );
}

/** `high` and `urgent` stand out; `normal` is quiet; `low` points down. */
const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "text-muted-foreground",
  normal: "text-muted-foreground",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-300",
  urgent: "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300",
};

const PRIORITY_ICONS: Partial<Record<TicketPriority, typeof Flame>> = {
  low: ArrowDown,
  high: ArrowUp,
  urgent: Flame,
};

export function TicketPriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  const t = useTranslations("supportAdmin");
  const Icon = PRIORITY_ICONS[priority];
  return (
    <Badge
      variant="outline"
      className={cn(PRIORITY_STYLES[priority], className)}
      title={t("priorityLabel", { priority: t(`priority.${priority}`) })}
    >
      {Icon && <Icon aria-hidden />}
      {t(`priority.${priority}`)}
    </Badge>
  );
}

/** The requester spoke last on an active ticket: a staff answer is due. */
export function AwaitingReplyBadge({ className }: { className?: string }) {
  const t = useTranslations("supportAdmin");
  return (
    <span
      className={cn(
        "text-primary inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <MessageCircleMore className="size-3.5" aria-hidden />
      {t("awaitingReply")}
    </span>
  );
}
