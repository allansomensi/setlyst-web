/**
 * The account's running trial, as the dashboard presents it: the welcome
 * dialog on first sign-in and the "Pro trial · N days left" chip in the
 * navigation. Pure, so it can be unit tested.
 */

import { parseApiTimestamp } from "@/lib/dates";
import type { BillingMe } from "@/types/billing";

const DAY_MS = 24 * 60 * 60 * 1000;

/** From this many days left on, the chip turns into a warning. */
export const TRIAL_WARNING_DAYS = 7;

export interface TrialInfo {
  planCode: string;
  /** Display name of the plan (localized by the caller). */
  planName: string;
  /** ISO timestamp the trial ends at. */
  endsAt: string;
  /** Whole days left, rounded up; 0 once less than a day remains. */
  daysLeft: number;
  /** Length of the trial in days (rounded), for "30 days of Pro". */
  totalDays: number;
}

/**
 * The running trial, or null when there is none: billing not enforced
 * (everything is free anyway), no subscription, a paid one, or a trial
 * whose end has already passed.
 */
export function trialInfo(
  billing: BillingMe | null | undefined,
  planName: string,
  now: number = Date.now(),
): TrialInfo | null {
  const subscription = billing?.subscription;
  if (!billing?.enforced || !subscription) return null;
  if (subscription.status !== "trialing") return null;

  const endsAt = subscription.trial_ends_at ?? subscription.current_period_end;
  if (!endsAt) return null;
  const end = parseApiTimestamp(endsAt).getTime();
  if (!Number.isFinite(end) || end <= now) return null;

  const start = parseApiTimestamp(subscription.started_at).getTime();
  const totalDays = Number.isFinite(start)
    ? Math.max(1, Math.round((end - start) / DAY_MS))
    : Math.ceil((end - now) / DAY_MS);

  return {
    planCode: subscription.plan_code,
    planName: planName || subscription.plan_code,
    endsAt,
    // Less than a day left reads "ends today", not "1 day left".
    daysLeft: end - now < DAY_MS ? 0 : Math.ceil((end - now) / DAY_MS),
    totalDays,
  };
}
