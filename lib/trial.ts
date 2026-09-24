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

/**
 * `GET /billing/me` with the fields added for the withdrawal right and
 * failed payments (CONTRACTS §3). Optional so an API that doesn't send them
 * yet reads as "not applicable".
 */
export type BillingState = BillingMe & {
  /** ISO UTC; non-null only inside the 7-day withdrawal window. */
  withdrawal_eligible_until?: string | null;
  /** ISO UTC; when the current paid subscription's payment first failed. */
  past_due_since?: string | null;
};

/**
 * What the dashboard shell says about the account's plan, in the sidebar
 * chip and (for everything but a comfortable trial) a banner:
 *
 * - `trial`: a trial is running with more than a week left;
 * - `trial_ending`: a trial ends within {@link TRIAL_WARNING_DAYS} days;
 * - `expired`: plans are enforced and the account's trial or subscription
 *   has ended with nothing in its place — features are locked now;
 * - `past_due`: a paid subscription's renewal failed; the plan keeps
 *   working for a short grace period while the card is updated.
 *
 * `null` for everything that needs no mention: billing not enforced, an
 * active plan, or an account that never had a subscription (the free
 * tier, chosen or not, isn't a problem to flag on every page).
 */
export type AccountPlanStatus =
  | { kind: "trial"; trial: TrialInfo }
  | { kind: "trial_ending"; trial: TrialInfo }
  | {
      kind: "expired";
      planName: string;
      endedAt: string | null;
      /** Whether what ended was a trial (vs. a paid or granted plan). */
      wasTrial: boolean;
    }
  | { kind: "past_due"; planName: string; since: string | null };

export type AccountPlanStatusKind = AccountPlanStatus["kind"];

export function accountPlanStatus(
  billing: BillingState | null | undefined,
  planName: string,
  now: number = Date.now(),
): AccountPlanStatus | null {
  if (!billing?.enforced) return null;
  const subscription = billing.subscription;
  if (!subscription) return null;

  if (subscription.status === "past_due") {
    return {
      kind: "past_due",
      planName: planName || subscription.plan_code,
      since: billing.past_due_since ?? null,
    };
  }

  const trial = trialInfo(billing, planName, now);
  if (trial) {
    return trial.daysLeft <= TRIAL_WARNING_DAYS
      ? { kind: "trial_ending", trial }
      : { kind: "trial", trial };
  }

  // No plan in effect any more (the API resolves `plan` from a live
  // subscription only): the trial or the subscription has run out.
  if (!billing.plan) {
    return {
      kind: "expired",
      planName: planName || subscription.plan_code,
      endedAt: subscription.trial_ends_at ?? subscription.current_period_end,
      wasTrial:
        subscription.source === "trial" || subscription.status === "trialing",
    };
  }

  return null;
}

/**
 * Whether the 7-day withdrawal right (CDC art. 49) can still be exercised:
 * the API sends the deadline only while it applies.
 */
export function withdrawalOpen(
  billing: BillingState | null | undefined,
  now: number = Date.now(),
): boolean {
  const until = billing?.withdrawal_eligible_until;
  if (!until) return false;
  const end = parseApiTimestamp(until).getTime();
  return Number.isFinite(end) && end > now;
}
