import { History } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatApiDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * "Last modified … by @someone" — shown on shared records (setlists,
 * bands, shows) so members know who changed what, and when.
 *
 * Hook-based but not async, so it renders from both Server and Client
 * Components (next-intl supports that).
 */
export function AuditStamp({
  updatedAt,
  updatedBy,
  className,
}: {
  updatedAt: string;
  updatedBy?: string | null;
  className?: string;
}) {
  const t = useTranslations("audit");
  const locale = useLocale();
  const date = formatApiDateTime(updatedAt, locale);

  return (
    <p
      className={cn(
        "text-muted-foreground flex items-center gap-1 text-xs",
        className,
      )}
    >
      <History className="h-3 w-3 shrink-0" aria-hidden />
      {updatedBy
        ? t("modifiedBy", { date, username: updatedBy })
        : t("modified", { date })}
    </p>
  );
}
