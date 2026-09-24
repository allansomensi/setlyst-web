"use client";

import { Infinity as InfinityIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { UpgradeHint } from "@/components/content/upgrade-hint";
import { cn } from "@/lib/utils";
import type { QuotaReport, QuotaUsageItem } from "@/types/api";

/** Usage above this share of the limit is highlighted as "almost full". */
const WARN_RATIO = 0.8;

function UsageRow({ item }: { item: QuotaUsageItem }) {
  const t = useTranslations("quotas");
  const label = t(`resources.${item.resource}`);

  // Per-band / per-setlist limits have no single "used" value.
  if (item.used === null) {
    return (
      <li className="flex items-center justify-between gap-3 py-2 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground flex items-center gap-2">
          {item.overridden && <Badge variant="outline">{t("custom")}</Badge>}
          {item.limit === null ? (
            <InfinityIcon className="h-4 w-4" aria-label={t("unlimited")} />
          ) : (
            t("perContainer", { limit: item.limit })
          )}
        </span>
      </li>
    );
  }

  const ratio = item.limit ? Math.min(1, item.used / item.limit) : 0;
  const full = item.limit !== null && item.used >= item.limit;
  const warn = !full && item.limit !== null && ratio >= WARN_RATIO;

  return (
    <li className="space-y-1.5 py-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span
          className={cn(
            "flex items-center gap-2 tabular-nums",
            full
              ? "text-destructive font-medium"
              : warn
                ? "font-medium text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
          )}
        >
          {item.overridden && <Badge variant="outline">{t("custom")}</Badge>}
          {item.limit === null
            ? t("usedUnlimited", { used: item.used })
            : t("usedOf", { used: item.used, limit: item.limit })}
        </span>
      </div>
      {item.limit !== null && (
        <div
          className="bg-muted h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={item.limit}
          aria-valuenow={item.used}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              full ? "bg-destructive" : warn ? "bg-amber-500" : "bg-primary",
            )}
            style={{
              width: `${Math.max(ratio * 100, item.used > 0 ? 2 : 0)}%`,
            }}
          />
        </div>
      )}
    </li>
  );
}

/**
 * How much of their allowance an account is using. Shared by Settings
 * (your own usage) and the staff user page.
 */
export function QuotaUsageList({ report }: { report: QuotaReport }) {
  const t = useTranslations("quotas");
  const counted = report.items.filter((item) => item.used !== null);
  const perContainer = report.items.filter((item) => item.used === null);

  return (
    <div className="space-y-4">
      {report.unlimited && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <InfinityIcon className="h-4 w-4" />
          {t("unlimitedAccount")}
        </p>
      )}
      <ul className="divide-y">
        {counted.map((item) => (
          <UsageRow key={item.resource} item={item} />
        ))}
      </ul>
      {perContainer.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            {t("perContainerTitle")}
          </p>
          <ul className="divide-y">
            {perContainer.map((item) => (
              <UsageRow key={item.resource} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The part of a quota an "Add" button cares about. */
export interface QuotaUsage {
  used: number;
  limit: number;
}

/**
 * The account-wide usage of `resource` from `GET /users/me/quotas`, or null
 * when there's nothing to show (unlimited, not counted, no report).
 */
export function quotaUsageOf(
  report: QuotaReport | null | undefined,
  resource: QuotaUsageItem["resource"],
): QuotaUsage | null {
  if (!report || report.unlimited) return null;
  const item = report.items.find((entry) => entry.resource === resource);
  if (!item || item.used === null || item.limit === null) return null;
  return { used: item.used, limit: item.limit };
}

/** Whether the allowance is used up, or nearly (from 80%). */
export function quotaState(usage: QuotaUsage | null | undefined): {
  full: boolean;
  warn: boolean;
} {
  if (!usage || usage.limit <= 0) {
    return { full: Boolean(usage && usage.limit <= 0), warn: false };
  }
  const full = usage.used >= usage.limit;
  return { full, warn: !full && usage.used / usage.limit >= WARN_RATIO };
}

/**
 * "123 / 150" next to an "Add" button, so a limit is never a surprise:
 * neutral normally, amber from 80%, red when full (the button is then
 * disabled and an UpgradeHint says why).
 */
export function QuotaChip({
  usage,
  resource,
  className,
}: {
  usage: QuotaUsage | null | undefined;
  resource: QuotaUsageItem["resource"];
  className?: string;
}) {
  const t = useTranslations("quotas");
  if (!usage) return null;
  const { full, warn } = quotaState(usage);
  const label = t("chipLabel", {
    resource: t(`resources.${resource}`),
    used: usage.used,
    limit: usage.limit,
  });
  return (
    <span
      title={label}
      aria-label={label}
      role="note"
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium tabular-nums",
        full
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : warn
            ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
            : "text-muted-foreground bg-muted/40",
        className,
      )}
    >
      {usage.used} / {usage.limit}
    </span>
  );
}

/**
 * Under an "Add" button that a full allowance disabled: says why, and
 * where to get more room.
 */
export function QuotaLimitNotice({
  usage,
  resource,
  className,
}: {
  usage: QuotaUsage | null | undefined;
  resource: QuotaUsageItem["resource"];
  className?: string;
}) {
  const t = useTranslations("quotas");
  if (!quotaState(usage).full) return null;
  return (
    <UpgradeHint
      className={className}
      message={t("fullHint", {
        // Mid-sentence: "the limit for songs", not "for Songs".
        resource: t(`resources.${resource}`).toLocaleLowerCase(),
      })}
    />
  );
}
