import { describe, expect, it } from "vitest";
import {
  accountPlanStatus,
  trialInfo,
  withdrawalOpen,
  type BillingState,
} from "@/lib/trial";
import type { BillingMe } from "@/types/billing";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-09-01T12:00:00Z");

function billing(overrides: Partial<BillingMe> = {}): BillingMe {
  return {
    enforced: true,
    plan: null,
    subscription: {
      plan_code: "pro",
      status: "trialing",
      source: "trial",
      // Naive UTC, as the API sends it.
      started_at: "2026-09-01T12:00:00",
      current_period_end: "2026-10-01T12:00:00",
      trial_ends_at: "2026-10-01T12:00:00",
      cancel_at_period_end: false,
    },
    features: {},
    credits: { balance: 0 },
    referral: {
      code: null,
      link_path: null,
      rewarded_count: 0,
      pending_count: 0,
    },
    rewards: [],
    ...overrides,
  };
}

describe("trialInfo", () => {
  it("describes a running trial", () => {
    expect(trialInfo(billing(), "Pro", now)).toEqual({
      planCode: "pro",
      planName: "Pro",
      endsAt: "2026-10-01T12:00:00",
      daysLeft: 30,
      totalDays: 30,
    });
    expect(trialInfo(billing(), "Pro", now + 28.5 * DAY)?.daysLeft).toBe(2);
    expect(trialInfo(billing(), "Pro", now + 29.5 * DAY)?.daysLeft).toBe(0);
  });

  it("reads naive timestamps as UTC", () => {
    // 1 hour before the end, in any time zone: "ends today".
    const info = trialInfo(billing(), "", Date.parse("2026-10-01T11:00:00Z"));
    expect(info?.daysLeft).toBe(0);
    expect(info?.planName).toBe("pro");
  });

  it("is null when there's nothing to announce", () => {
    expect(trialInfo(null, "Pro", now)).toBeNull();
    expect(trialInfo(billing({ enforced: false }), "Pro", now)).toBeNull();
    expect(trialInfo(billing({ subscription: null }), "Pro", now)).toBeNull();
    const paid = billing();
    paid.subscription!.status = "active";
    expect(trialInfo(paid, "Pro", now)).toBeNull();
    expect(trialInfo(billing(), "Pro", now + 31 * DAY)).toBeNull();
  });
});

const PLAN = {
  code: "pro",
} as unknown as NonNullable<BillingMe["plan"]>;

describe("accountPlanStatus", () => {
  it("is a trial, then a trial ending in its last week", () => {
    expect(accountPlanStatus(billing({ plan: PLAN }), "Pro", now)?.kind).toBe(
      "trial",
    );
    expect(
      accountPlanStatus(billing({ plan: PLAN }), "Pro", now + 25 * DAY)?.kind,
    ).toBe("trial_ending");
  });

  it("is expired once no plan is in effect", () => {
    const ended = billing();
    ended.subscription!.status = "expired";
    const status = accountPlanStatus(ended, "Pro", now + 31 * DAY);
    expect(status).toEqual({
      kind: "expired",
      planName: "Pro",
      endedAt: "2026-10-01T12:00:00",
      wasTrial: true,
    });
  });

  it("is past_due with the date the payment failed", () => {
    const state: BillingState = {
      ...billing({ plan: PLAN }),
      past_due_since: "2026-09-10T08:00:00",
    };
    state.subscription = {
      ...state.subscription!,
      status: "past_due",
      source: "payment",
    };
    expect(accountPlanStatus(state, "Pro", now)).toEqual({
      kind: "past_due",
      planName: "Pro",
      since: "2026-09-10T08:00:00",
    });
  });

  it("is the beta while plans aren't enforced", () => {
    expect(accountPlanStatus(billing({ enforced: false }), "Pro", now)).toEqual(
      { kind: "beta" },
    );
  });

  it("says nothing when there is nothing to flag", () => {
    expect(accountPlanStatus(null, "Pro", now)).toBeNull();
    expect(
      accountPlanStatus(
        billing({ enforced: false, access: "staff" }),
        "Pro",
        now,
      ),
    ).toBeNull();
    expect(
      accountPlanStatus(billing({ subscription: null }), "Pro", now),
    ).toBeNull();
    const active = billing({ plan: PLAN });
    active.subscription!.status = "active";
    expect(accountPlanStatus(active, "Pro", now)).toBeNull();
  });
});

describe("withdrawalOpen", () => {
  it("is open only until the deadline the API sends", () => {
    const state: BillingState = {
      ...billing(),
      withdrawal_eligible_until: "2026-09-05T12:00:00",
    };
    expect(withdrawalOpen(state, now)).toBe(true);
    expect(withdrawalOpen(state, now + 5 * DAY)).toBe(false);
    expect(withdrawalOpen(billing(), now)).toBe(false);
    expect(withdrawalOpen(null, now)).toBe(false);
  });
});
