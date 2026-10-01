import { Badge } from "@/components/ui/badge";
import { TICKET_STATUS_STYLES } from "@/lib/support";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/types/operations";

/**
 * A support request's status as a colored badge. The label comes from
 * the caller (`support.status.*`), so this renders from server and client
 * components alike.
 */
export function TicketStatusBadge({
  status,
  label,
  className,
}: {
  status: TicketStatus;
  label: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(TICKET_STATUS_STYLES[status], className)}
    >
      {label}
    </Badge>
  );
}
