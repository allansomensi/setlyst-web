"use client";

import { CircleAlert, CreditCard, Gift, Hourglass } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";
import type { AccountPlanStatus } from "@/lib/trial";
import { cn } from "@/lib/utils";

export const SUBSCRIPTION_SETTINGS_HREF =
  "/dashboard/settings?section=subscription";

/**
 * The account's plan state, always on screen in the navigation:
 * "Pro trial · 23 days left" while a trial runs (amber in its last week),
 * "Trial ended · Choose a plan" once it has, and "Payment failed" when a
 * renewal didn't go through. Links to the subscription settings.
 */
export function TrialStatus({
  status,
  collapsed = false,
  onNavigate,
  className,
}: {
  status: AccountPlanStatus | null;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useTranslations("trial");
  if (!status) return null;

  const { Icon, label, detail, tone } = describe(status, t);

  return (
    <Link
      href={SUBSCRIPTION_SETTINGS_HREF}
      onClick={onNavigate}
      title={`${label} · ${detail}`}
      aria-label={`${label} · ${detail}`}
      className={cn(
        "focus-visible:ring-ring/50 flex items-center gap-2 rounded-lg border text-xs font-medium transition-colors outline-none focus-visible:ring-3",
        TONES[tone],
        collapsed
          ? "h-9 w-9 justify-center pointer-coarse:size-10"
          : "px-2.5 py-1.5",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && (
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate">{label}</span>
          <span className="block truncate font-normal opacity-80">
            {detail}
          </span>
        </span>
      )}
    </Link>
  );
}

type Tone = "info" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  info: "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
  warning:
    "border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300",
  danger:
    "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
};

export function describe(
  status: AccountPlanStatus,
  t: ReturnType<typeof useTranslations<"trial">>,
) {
  switch (status.kind) {
    case "trial":
    case "trial_ending":
      return {
        Icon: status.kind === "trial" ? Gift : Hourglass,
        label: t("chip", { plan: status.trial.planName }),
        detail: t("daysLeft", { days: status.trial.daysLeft }),
        tone: (status.kind === "trial" ? "info" : "warning") as Tone,
      };
    case "expired":
      return {
        Icon: CircleAlert,
        label: status.wasTrial
          ? t("status.expired.chip")
          : t("status.expired.chipPlan"),
        detail: t("status.expired.chipDetail"),
        tone: "warning" as Tone,
      };
    case "past_due":
      return {
        Icon: CreditCard,
        label: t("status.pastDue.chip"),
        detail: t("status.pastDue.chipDetail"),
        tone: "danger" as Tone,
      };
  }
}
