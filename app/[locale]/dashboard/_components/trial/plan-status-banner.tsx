"use client";

import { useState, useSyncExternalStore } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CreditCard, Loader2, Sparkles, X } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { openBillingPortal } from "@/lib/actions/billing";
import { toastActionError } from "@/lib/action-toast";
import { parseApiTimestamp } from "@/lib/dates";
import type { AccountPlanStatus } from "@/lib/trial";
import { cn } from "@/lib/utils";
import { SUBSCRIPTION_SETTINGS_HREF, describe } from "./trial-status";

const DISMISS_KEY = "setlyst:plan-banner-dismissed";

/**
 * Identifies one "occurrence" of a state, so dismissing it hides that
 * occurrence only: a trial that is one day closer to its end, a new
 * payment failure or a newly expired plan shows the banner again.
 */
function occurrence(status: AccountPlanStatus): string {
  switch (status.kind) {
    case "trial":
    case "trial_ending":
      return `${status.kind}:${status.trial.endsAt}:${status.trial.daysLeft}`;
    case "expired":
      return `expired:${status.endedAt ?? ""}`;
    case "past_due":
      return `past_due:${status.since ?? ""}`;
  }
}

/**
 * Past-due is dismissed for this browser session only (a failed payment
 * locks features in days, so it comes back); the others for good on this
 * device, per occurrence.
 */
function storageFor(status: AccountPlanStatus): Storage | null {
  try {
    return status.kind === "past_due" ? sessionStorage : localStorage;
  } catch {
    return null;
  }
}

const DISMISS_EVENT = "setlyst:plan-banner-dismissed";
/** Server render and hydration: nothing is known yet, so show nothing. */
const UNKNOWN = "\u0000";

function subscribe(listener: () => void) {
  window.addEventListener(DISMISS_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(DISMISS_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * A dismissible banner at the top of every dashboard page for the states
 * that need action: the trial's last week, a trial or plan that has ended,
 * and a failed renewal (which links straight to the billing portal). The
 * comfortable part of a trial only gets the chip in the navigation.
 */
export function PlanStatusBanner({
  status,
  readOnly = false,
}: {
  status: AccountPlanStatus | null;
  readOnly?: boolean;
}) {
  const t = useTranslations("trial");
  const format = useFormatter();
  const [portalPending, setPortalPending] = useState(false);
  // Hidden for this page view even if storage refuses the write.
  const [hiddenNow, setHiddenNow] = useState<string | null>(null);

  const key = status && status.kind !== "trial" ? occurrence(status) : null;

  // Hidden on the server and until storage has been read after hydration:
  // a banner that rendered and then vanished would shift the whole page on
  // every load for someone who dismissed it.
  const dismissed = useSyncExternalStore(
    subscribe,
    () => {
      if (!status) return null;
      try {
        return storageFor(status)?.getItem(DISMISS_KEY) ?? null;
      } catch {
        return null;
      }
    },
    () => UNKNOWN,
  );

  if (!status || status.kind === "trial" || !key) return null;
  if (dismissed === UNKNOWN || dismissed === key || hiddenNow === key) {
    return null;
  }

  const dismiss = () => {
    setHiddenNow(key);
    try {
      storageFor(status)?.setItem(DISMISS_KEY, key);
      window.dispatchEvent(new Event(DISMISS_EVENT));
    } catch {
      // Hidden for this page view; it may come back on the next load.
    }
  };

  const goToPortal = async () => {
    if (portalPending) return;
    setPortalPending(true);
    const result = await openBillingPortal();
    if (!result.success || !result.data) {
      setPortalPending(false);
      if (!result.success) toastActionError(result, result.error);
      return;
    }
    window.location.assign(result.data.url);
  };

  const { Icon } = describe(status, t);

  const date = (value: string | null) =>
    value
      ? format.dateTime(parseApiTimestamp(value), { dateStyle: "long" })
      : null;

  let message: string;
  switch (status.kind) {
    case "trial_ending":
      message = t("status.ending.banner", {
        plan: status.trial.planName,
        days: status.trial.daysLeft,
      });
      break;
    case "expired":
      message = t("status.expired.banner", { plan: status.planName });
      break;
    case "past_due": {
      const since = date(status.since);
      message = since
        ? t("status.pastDue.bannerSince", { date: since })
        : t("status.pastDue.banner");
      break;
    }
  }

  const tone =
    status.kind === "past_due"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200";

  return (
    <div
      role={status.kind === "past_due" ? "alert" : "status"}
      className={cn(
        "flex shrink-0 items-start gap-3 border-b px-4 py-2.5 text-sm md:items-center md:px-8",
        tone,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 md:mt-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">{message}</p>
      <div className="flex shrink-0 items-center gap-1">
        {status.kind === "past_due" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={goToPortal}
            disabled={portalPending || readOnly}
            className="bg-background/70"
          >
            {portalPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <CreditCard className="size-3.5" aria-hidden />
            )}
            {t("status.pastDue.action")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            asChild
            className="bg-background/70"
          >
            <Link href={SUBSCRIPTION_SETTINGS_HREF}>
              <Sparkles className="size-3.5" aria-hidden />
              {t("status.choosePlan")}
            </Link>
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={dismiss}
          aria-label={t("status.dismiss")}
          title={t("status.dismiss")}
        >
          <X aria-hidden />
        </Button>
      </div>
    </div>
  );
}
