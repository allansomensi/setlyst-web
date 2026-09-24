"use client";

import { Gift, Hourglass } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";
import { TRIAL_WARNING_DAYS, type TrialInfo } from "@/lib/trial";
import { cn } from "@/lib/utils";

/**
 * "Pro trial · 23 days left", always on screen in the navigation while a
 * trial runs, so it is never a surprise that everything is unlocked — or
 * that it stops being. Links to the subscription settings.
 */
export function TrialStatus({
  trial,
  collapsed = false,
  onNavigate,
  className,
}: {
  trial: TrialInfo | null;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useTranslations("trial");
  if (!trial) return null;

  const ending = trial.daysLeft <= TRIAL_WARNING_DAYS;
  const Icon = ending ? Hourglass : Gift;
  const label = t("chip", { plan: trial.planName });
  const remaining = t("daysLeft", { days: trial.daysLeft });

  return (
    <Link
      href="/dashboard/settings#subscription"
      onClick={onNavigate}
      title={`${label} · ${remaining}`}
      aria-label={`${label} · ${remaining}`}
      className={cn(
        "focus-visible:ring-ring/50 flex items-center gap-2 rounded-lg border text-xs font-medium transition-colors outline-none focus-visible:ring-3",
        ending
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
          : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
        collapsed ? "h-9 w-9 justify-center" : "px-2.5 py-1.5",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && (
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate">{label}</span>
          <span className="block truncate font-normal opacity-80">
            {remaining}
          </span>
        </span>
      )}
    </Link>
  );
}
